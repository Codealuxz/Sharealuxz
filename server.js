require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { nanoid } = require('nanoid');
const fs = require('fs');
const { MongoClient } = require('mongodb');


const app = express();
const server = http.createServer(app);


const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    maxHttpBufferSize: 1e9, 
    pingTimeout: 180000, 
    pingInterval: 150, 
    transports: ['websocket', 'polling'] 
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));


const activeConnections = new Map();

const activeTransfers = new Map();

const transferTokens = new Map();


const statsFilePath = path.join(__dirname, 'data', 'stats.json');


let totalFilesSent = 0;
let totalBytesSent = 0;

// MongoDB
const mongoClient = new MongoClient(process.env.MONGODB_URI);
let db;
let statsCollection;


// Connexion MongoDB
async function connectMongoDB() {
    try {
        await mongoClient.connect();
        db = mongoClient.db('sharealuxz');
        statsCollection = db.collection('stats');
        console.log('Connexion MongoDB établie');

        // Charger les stats depuis MongoDB
        await loadStatsFromMongoDB();
    } catch (err) {
        console.error('Erreur de connexion MongoDB:', err);
        console.log('Utilisation du système de fichiers comme fallback');
        loadStatsFromFile();
    }
}

async function loadStatsFromMongoDB() {
    try {
        const stats = await statsCollection.findOne({ _id: 'global' });
        if (stats) {
            totalFilesSent = stats.totalFiles || 0;
            totalBytesSent = stats.totalBytes || 0;
            console.log(`Statistiques chargées depuis MongoDB: ${totalFilesSent} fichiers, ${(totalBytesSent / (1024 * 1024 * 1024)).toFixed(2)} Go`);
        } else {
            console.log('Aucune statistique trouvée dans MongoDB, démarrage avec des valeurs à 0');
            await saveStatsToMongoDB();
        }
    } catch (err) {
        console.error('Erreur lors du chargement des statistiques depuis MongoDB:', err);
    }
}

async function saveStatsToMongoDB() {
    try {
        await statsCollection.updateOne(
            { _id: 'global' },
            {
                $set: {
                    totalFiles: totalFilesSent,
                    totalBytes: totalBytesSent,
                    totalGB: parseFloat((totalBytesSent / (1024 * 1024 * 1024)).toFixed(2)),
                    lastUpdated: new Date()
                }
            },
            { upsert: true }
        );
        console.log('Statistiques sauvegardées dans MongoDB');
    } catch (err) {
        console.error('Erreur lors de la sauvegarde des statistiques dans MongoDB:', err);
    }
}

function ensureDataDir() {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('Dossier data créé');
    }
}


function loadStatsFromFile() {
    ensureDataDir();
    try {
        if (fs.existsSync(statsFilePath)) {
            const statsData = fs.readFileSync(statsFilePath, 'utf8');
            const stats = JSON.parse(statsData);
            totalFilesSent = stats.totalFiles || 0;
            totalBytesSent = parseFloat(stats.totalGB || 0) * 1024 * 1024 * 1024;
            console.log(`Statistiques chargées: ${totalFilesSent} fichiers, ${(totalBytesSent / (1024 * 1024 * 1024)).toFixed(2)} Go`);
        } else {
            console.log('Aucun fichier de statistiques trouvé, démarrage avec des valeurs à 0');
            saveStatsToFile();
        }
    } catch (err) {
        console.error('Erreur lors du chargement des statistiques:', err);

    }
}


function saveStatsToFile() {
    ensureDataDir();
    try {
        const stats = {
            totalFiles: totalFilesSent,
            totalGB: parseFloat((totalBytesSent / (1024 * 1024 * 1024)).toFixed(2))
        };
        fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2), 'utf8');
        console.log('Statistiques sauvegardées dans le fichier');
    } catch (err) {
        console.error('Erreur lors de la sauvegarde des statistiques:', err);
    }
}


// Initialisation MongoDB
connectMongoDB();


// Sauvegarder les stats périodiquement (MongoDB + fichier en backup)
setInterval(async () => {
    await saveStatsToMongoDB();
    saveStatsToFile();
}, 5 * 60 * 1000); 


function generateNumericCode(length = 8) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10).toString(); 
    }
    return result;
}


function cleanupSocketResources(socketId) {
    console.log(`Nettoyage des ressources pour la socket ${socketId}`);

    
    for (const [code, id] of activeConnections.entries()) {
        if (id === socketId) {
            console.log(`Suppression du code ${code} pour la socket déconnectée ${socketId}`);
            activeConnections.delete(code);
        }
    }

    
    for (const [transferId, transfer] of activeTransfers.entries()) {
        if (transfer.senderId === socketId || transfer.receiverId === socketId) {
            console.log(`Marquage du transfert ${transferId} comme interrompu`);
            transfer.interrupted = true;

            
            if (transferTokens.has(transferId)) {
                console.log(`Conservation du token pour le transfert interrompu ${transferId}`);
                
            }

            
            setTimeout(() => {
                if (activeTransfers.has(transferId) && activeTransfers.get(transferId).interrupted) {
                    console.log(`Suppression du transfert interrompu ${transferId} après délai d'attente`);
                    activeTransfers.delete(transferId);
                }
            }, 30 * 60 * 1000); 
        }
    }
}


function getActiveConnectionsCount() {
    return io.engine.clientsCount;
}


function broadcastStats() {
    io.emit('stats-update', {
        activeUsers: getActiveConnectionsCount(),
        totalFiles: totalFilesSent,
        totalGB: (totalBytesSent / (1024 * 1024 * 1024)).toFixed(2)
    });
}


app.get('/stats', (req, res) => {
    res.json({
        activeUsers: getActiveConnectionsCount(),
        totalFiles: totalFilesSent,
        totalGB: parseFloat((totalBytesSent / (1024 * 1024 * 1024)).toFixed(2))
    });
});


app.get('/api/stats', (req, res) => {
    try {
        const stats = {
            activeUsers: getActiveConnectionsCount(),
            totalFiles: totalFilesSent,
            totalGB: parseFloat((totalBytesSent / (1024 * 1024 * 1024)).toFixed(2))
        };
        res.json(stats);
    } catch (err) {
        console.error('Erreur lors de la récupération des statistiques:', err);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des statistiques' });
    }
});

io.on('connection', (socket) => {
    console.log('Un utilisateur s\'est connecté', socket.id);

    
    socket.on('pong', (data) => {
        
        socket._lastPing = Date.now();
        
    });

    
    socket.on('generate-code', () => {
        const code = generateNumericCode(8);
        activeConnections.set(code, socket.id);

        
        setTimeout(() => {
            if (activeConnections.has(code)) {
                console.log(`Code ${code} expiré après 10 minutes`);
                activeConnections.delete(code);
                socket.emit('code-expired', code);
            }
        }, 10 * 60 * 1000);

        console.log(`Code ${code} généré pour la socket ${socket.id}`);
        socket.emit('code-generated', code);
    });

    
    socket.on('connect-with-code', (code) => {
        if (!activeConnections.has(code)) {
            console.log(`Tentative de connexion avec un code invalide: ${code}`);
            socket.emit('connection-error', 'Code invalide ou expiré');
            return;
        }

        const senderId = activeConnections.get(code);
        const senderSocket = io.sockets.sockets.get(senderId);

        if (!senderSocket) {
            console.log(`L'expéditeur ${senderId} n'est plus connecté pour le code ${code}`);
            socket.emit('connection-error', 'L\'expéditeur n\'est plus connecté');
            activeConnections.delete(code);
            return;
        }

        
        const transferId = nanoid(12);

        
        activeTransfers.set(transferId, {
            senderId: senderId,
            receiverId: socket.id,
            code: code,
            createdAt: Date.now(),
            interrupted: false
        });

        console.log(`Connexion établie entre l'expéditeur ${senderId} et le récepteur ${socket.id} avec le code ${code} (transfert ${transferId})`);

        
        senderSocket.emit('receiver-connected', {
            receiverId: socket.id,
            code,
            transferId
        });

        socket.emit('connected-to-sender', {
            senderId,
            code,
            transferId
        });
    });

    
    socket.on('ready-to-receive', (data) => {
        const senderId = data.senderId;
        const senderSocket = io.sockets.sockets.get(senderId);

        if (senderSocket) {
            console.log(`Le récepteur ${socket.id} est prêt à recevoir depuis l'expéditeur ${senderId}`);

            
            if (data.isResuming && data.offset) {
                console.log(`Reprise du téléchargement à partir de l'offset ${data.offset}`);
            }

            senderSocket.emit('ready-to-receive', {
                receiverId: socket.id,
                offset: data.offset || 0,
                isResuming: data.isResuming || false
            });
        } else {
            console.log(`L'expéditeur ${senderId} n'est plus disponible pour le récepteur ${socket.id}`);
            socket.emit('connection-error', 'L\'expéditeur n\'est plus connecté');
        }
    });

    
    socket.on('file-transfer-start', (data) => {
        const targetSocket = io.sockets.sockets.get(data.receiverId);
        if (targetSocket) {
            console.log(`Début du transfert de fichier "${data.name}" (${formatFileSize(data.size)}) de ${socket.id} vers ${data.receiverId}`);


            totalFilesSent++;
            totalBytesSent += data.size;

            // Sauvegarder dans MongoDB et fichier
            saveStatsToMongoDB();
            saveStatsToFile();
            broadcastStats();

            
            if (data.transferId && data.token) {
                transferTokens.set(data.transferId, {
                    token: data.token,
                    senderId: socket.id,
                    receiverId: data.receiverId,
                    createdAt: Date.now()
                });
                console.log(`Token d'authentification enregistré pour le transfert ${data.transferId}`);
            }

            targetSocket.emit('file-transfer-start', {
                name: data.name,
                size: data.size,
                type: data.type,
                senderId: socket.id,
                transferId: data.transferId,
                token: data.token
            });
        } else {
            console.log(`Récepteur ${data.receiverId} non disponible pour le début du transfert`);
            socket.emit('transfer-error', 'Le récepteur n\'est plus connecté');
        }
    });

    
    socket.on('compression-progress', (data) => {
        const targetSocket = io.sockets.sockets.get(data.receiverId);
        if (targetSocket) {
            console.log(`Progression de la compression: ${data.progress}% de ${socket.id} vers ${data.receiverId}`);
            targetSocket.emit('compression-progress', {
                progress: data.progress,
                senderId: socket.id
            });
        }
    });

    socket.on('compression-complete', (data) => {
        const targetSocket = io.sockets.sockets.get(data.receiverId);
        if (targetSocket) {
            console.log(`Compression terminée pour le transfert de ${socket.id} vers ${data.receiverId}`);
            targetSocket.emit('compression-complete', {
                senderId: socket.id
            });
        }
    });

    socket.on('file-chunk', (data) => {
        const targetSocket = io.sockets.sockets.get(data.receiverId);
        if (targetSocket) {
            
            if (data.transferId && data.token) {
                const tokenInfo = transferTokens.get(data.transferId);
                if (!tokenInfo || tokenInfo.token !== data.token) {
                    console.log(`Token d'authentification invalide pour le transfert ${data.transferId}`);
                    socket.emit('transfer-error', 'Token d\'authentification invalide');
                    return;
                }
            }

            targetSocket.emit('file-chunk', {
                chunk: data.chunk,
                progress: data.progress,
                senderId: socket.id,
                transferId: data.transferId,
                offset: data.offset
            });
        } else {
            
            let isAlreadyInterrupted = false;
            let transferId = null;

            for (const [id, transfer] of activeTransfers.entries()) {
                if (transfer.senderId === socket.id && transfer.receiverId === data.receiverId) {
                    isAlreadyInterrupted = transfer.interrupted;
                    transferId = id;
                    break;
                }
            }

            
            if (!isAlreadyInterrupted) {
                console.log(`Récepteur ${data.receiverId} non disponible pour le transfert de morceau`);

                if (transferId) {
                    const transfer = activeTransfers.get(transferId);
                    if (transfer) {
                        transfer.interrupted = true;
                        console.log(`Marquage du transfert ${transferId} comme interrompu`);
                    }
                }

                socket.emit('transfer-error', 'Le récepteur s\'est déconnecté pendant le transfert');
            }
        }
    });

    
    socket.on('chunk-ack', (data) => {
        const targetSocket = io.sockets.sockets.get(data.senderId);
        if (targetSocket) {
            targetSocket.emit('chunk-ack', {
                offset: data.offset,
                receiverId: socket.id
            });
        }
    });

    socket.on('file-transfer-complete', (data) => {
        const targetSocket = io.sockets.sockets.get(data.receiverId);
        if (targetSocket) {
            console.log(`Transfert terminé de ${socket.id} vers ${data.receiverId}`);

            
            if (data.transferId && transferTokens.has(data.transferId)) {
                transferTokens.delete(data.transferId);
                console.log(`Token d'authentification supprimé pour le transfert ${data.transferId}`);
            }

            targetSocket.emit('file-transfer-complete', {
                senderId: socket.id,
                transferId: data.transferId
            });

            
            for (const [transferId, transfer] of activeTransfers.entries()) {
                if (transfer.senderId === socket.id && transfer.receiverId === data.receiverId) {
                    activeTransfers.delete(transferId);
                    break;
                }
            }
        } else {
            console.log(`Récepteur ${data.receiverId} non disponible pour la fin du transfert`);
        }
    });

    
    socket.on('cancel-transfer', (data) => {
        let targetId = null;

        if (data.receiverId) {
            
            targetId = data.receiverId;
            console.log(`L'expéditeur ${socket.id} a annulé le transfert vers ${targetId}`);
        } else if (data.senderId) {
            
            targetId = data.senderId;
            console.log(`Le récepteur ${socket.id} a annulé le transfert depuis ${targetId}`);
        }

        if (targetId) {
            const targetSocket = io.sockets.sockets.get(targetId);
            if (targetSocket) {
                targetSocket.emit('cancel-transfer');
            }

            
            for (const [transferId, transfer] of activeTransfers.entries()) {
                if ((transfer.senderId === socket.id && transfer.receiverId === targetId) ||
                    (transfer.receiverId === socket.id && transfer.senderId === targetId)) {
                    activeTransfers.delete(transferId);
                    break;
                }
            }
        }
    });

    
    socket.on('resume-transfer', (data) => {
        if (!data.transferId || !data.token) {
            socket.emit('resume-error', 'Informations de reprise incomplètes');
            return;
        }

        
        const tokenInfo = transferTokens.get(data.transferId);
        if (!tokenInfo || tokenInfo.token !== data.token) {
            console.log(`Tentative de reprise avec un token invalide pour le transfert ${data.transferId}`);
            socket.emit('resume-error', 'Token de reprise invalide');
            return;
        }

        
        if (data.isSender && tokenInfo.senderId !== socket.id) {
            console.log(`Mise à jour de l'ID d'expéditeur pour le transfert ${data.transferId}: ${tokenInfo.senderId} -> ${socket.id}`);
            tokenInfo.senderId = socket.id;
        } else if (!data.isSender && tokenInfo.receiverId !== socket.id) {
            console.log(`Mise à jour de l'ID de récepteur pour le transfert ${data.transferId}: ${tokenInfo.receiverId} -> ${socket.id}`);
            tokenInfo.receiverId = socket.id;
        }

        
        socket.emit('resume-approved', {
            transferId: data.transferId,
            offset: data.offset || 0
        });

        console.log(`Reprise de transfert approuvée pour ${data.transferId} à partir de l'offset ${data.offset || 0}`);
    });

    
    socket.on('check-receiver', (data, callback) => {
        if (!data.receiverId) {
            callback(false);
            return;
        }

        const receiverSocket = io.sockets.sockets.get(data.receiverId);
        const isConnected = !!receiverSocket;

        console.log(`Vérification de la connexion du récepteur ${data.receiverId}: ${isConnected ? 'connecté' : 'déconnecté'}`);
        callback(isConnected);
    });

    socket.on('disconnect', () => {
        console.log('Un utilisateur s\'est déconnecté', socket.id);
        cleanupSocketResources(socket.id);
        broadcastStats();
    });
});


function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


setInterval(() => {
    io.sockets.emit('ping', { timestamp: Date.now() });
}, 30000);

const PORT = process.env.PORT || 3008;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});


process.on('SIGINT', async () => {
    console.log('Arrêt du serveur, sauvegarde des statistiques...');
    await saveStatsToMongoDB();
    saveStatsToFile();
    await mongoClient.close();
    process.exit();
});

process.on('SIGTERM', async () => {
    console.log('Arrêt du serveur, sauvegarde des statistiques...');
    await saveStatsToMongoDB();
    saveStatsToFile();
    await mongoClient.close();
    process.exit();
}); 
