require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
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
    maxHttpBufferSize: 5e9, // Augmenté à 5 GB pour supporter de gros fichiers
    pingTimeout: 180000,
    pingInterval: 150,
    transports: ['websocket', 'polling'],
    // Optimisations pour la vitesse
    perMessageDeflate: false, // Désactive la compression WebSocket pour plus de vitesse
    httpCompression: false, // Désactive la compression HTTP pour plus de vitesse
    allowEIO3: true // Support des anciennes versions pour compatibilité
});

app.use(cors());

// Configuration des en-têtes de sécurité avec Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'", // Nécessaire pour les scripts inline
                "'unsafe-hashes'", // Nécessaire pour les event handlers inline
                "https://cdnjs.cloudflare.com",
                "https://pagead2.googlesyndication.com",
                "https://adservice.google.com",
                "https://googleads.g.doubleclick.net",
                "https://www.googletagservices.com",
                "https://ep2.adtrafficquality.google",
                "https://cdn.socket.io"
            ],
            scriptSrcAttr: ["'unsafe-inline'", "'unsafe-hashes'"],
            styleSrc: [
                "'self'",
                "'unsafe-inline'", // Nécessaire pour les styles inline
                "https://cdnjs.cloudflare.com"
            ],
            fontSrc: [
                "'self'",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "ws:", "https:"],
            mediaSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameSrc: ["'self'", "https://pagead2.googlesyndication.com", "https://googleads.g.doubleclick.net"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
            upgradeInsecureRequests: []
        }
    },
    strictTransportSecurity: {
        maxAge: 31536000, // 1 an
        includeSubDomains: true,
        preload: true
    },
    xContentTypeOptions: true, // nosniff
    xFrameOptions: { action: 'sameorigin' },
    xXssProtection: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use(express.static(path.join(__dirname, 'public')));


const activeConnections = new Map();

const activeTransfers = new Map();

const transferTokens = new Map();


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
        console.error('ATTENTION: Impossible de se connecter à MongoDB. Les statistiques ne seront pas sauvegardées.');
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



// Initialisation MongoDB
connectMongoDB();


// Sauvegarder les stats périodiquement dans MongoDB
setInterval(async () => {
    await saveStatsToMongoDB();
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


// Middleware pour vérifier si l'administration est activée
function checkAdminEnabled(req, res, next) {
    const isAdminEnabled = process.env.ADMIN_ENABLED === 'true';
    if (!isAdminEnabled) {
        return res.status(403).json({ error: 'Administration désactivée' });
    }
    next();
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

// Route pour vérifier si l'administration est activée
app.get('/api/admin/enabled', (req, res) => {
    const isAdminEnabled = process.env.ADMIN_ENABLED === 'true';
    res.json({ enabled: isAdminEnabled });
});

// Route pour récupérer les stats admin (avec date de mise à jour)
app.get('/api/admin/stats', checkAdminEnabled, async (req, res) => {
    try {
        const stats = await statsCollection.findOne({ _id: 'global' });
        if (stats) {
            res.json({
                totalFiles: stats.totalFiles || 0,
                totalGB: stats.totalGB || 0,
                totalBytes: stats.totalBytes || 0,
                lastUpdated: stats.lastUpdated
            });
        } else {
            res.json({
                totalFiles: 0,
                totalGB: 0,
                totalBytes: 0,
                lastUpdated: null
            });
        }
    } catch (err) {
        console.error('Erreur lors de la récupération des statistiques admin:', err);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des statistiques' });
    }
});

// Route pour mettre à jour les stats manuellement
app.put('/api/admin/stats', checkAdminEnabled, express.json(), async (req, res) => {
    try {
        const { totalFiles, totalGB } = req.body;

        if (typeof totalFiles !== 'number' || typeof totalGB !== 'number') {
            return res.status(400).json({ error: 'Les paramètres totalFiles et totalGB doivent être des nombres' });
        }

        if (totalFiles < 0 || totalGB < 0) {
            return res.status(400).json({ error: 'Les valeurs ne peuvent pas être négatives' });
        }

        // Convertir GB en bytes
        const totalBytes = totalGB * 1024 * 1024 * 1024;

        // Mettre à jour les variables globales
        totalFilesSent = totalFiles;
        totalBytesSent = totalBytes;

        // Sauvegarder dans MongoDB
        await statsCollection.updateOne(
            { _id: 'global' },
            {
                $set: {
                    totalFiles: totalFiles,
                    totalBytes: totalBytes,
                    totalGB: parseFloat(totalGB.toFixed(2)),
                    lastUpdated: new Date()
                }
            },
            { upsert: true }
        );

        console.log(`Statistiques mises à jour manuellement: ${totalFiles} fichiers, ${totalGB.toFixed(2)} Go`);

        // Diffuser les nouvelles stats à tous les clients connectés
        broadcastStats();

        res.json({
            success: true,
            totalFiles: totalFiles,
            totalGB: parseFloat(totalGB.toFixed(2))
        });
    } catch (err) {
        console.error('Erreur lors de la mise à jour des statistiques:', err);
        res.status(500).json({ error: 'Erreur serveur lors de la mise à jour des statistiques' });
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

            // Sauvegarder dans MongoDB
            saveStatsToMongoDB();
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
                token: data.token,
                isText: data.isText || false  // Transmettre le flag isText
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

    // ========================================
    // QUICK SEND EVENTS
    // ========================================

    // Enregistrement en tant que receiver
    socket.on('quicksend-register-receiver', (data) => {
        socket.quickSendRole = 'receiver';
        socket.quickSendPseudo = data.pseudo;
        console.log(`Quick Send: ${data.pseudo} (${socket.id}) s'est enregistré comme receiver`);

        // Notifier tous les senders qu'un nouveau receiver est disponible
        broadcastQuickSendUsersList();
    });

    // Enregistrement en tant que sender
    socket.on('quicksend-register-sender', (data) => {
        socket.quickSendRole = 'sender';
        socket.quickSendPseudo = data.pseudo;
        console.log(`Quick Send: ${data.pseudo} (${socket.id}) s'est enregistré comme sender`);
    });

    // Désenregistrement
    socket.on('quicksend-unregister', () => {
        console.log(`Quick Send: ${socket.quickSendPseudo} (${socket.id}) s'est désenregistré`);
        const wasReceiver = socket.quickSendRole === 'receiver';
        socket.quickSendRole = null;
        socket.quickSendPseudo = null;

        // Si c'était un receiver, mettre à jour la liste pour les senders
        if (wasReceiver) {
            broadcastQuickSendUsersList();
        }
    });

    // Demander la liste des receivers en ligne
    socket.on('quicksend-request-users-list', () => {
        const receivers = [];
        io.sockets.sockets.forEach((sock) => {
            if (sock.quickSendRole === 'receiver' && sock.id !== socket.id) {
                receivers.push({
                    socketId: sock.id,
                    pseudo: sock.quickSendPseudo
                });
            }
        });
        socket.emit('quicksend-users-list', receivers);
        console.log(`Quick Send: Envoi de la liste des receivers (${receivers.length} en ligne)`);
    });

    // Envoyer une demande de transfert à un receiver
    socket.on('quicksend-send-request', (data) => {
        const receiverSocket = io.sockets.sockets.get(data.receiverSocketId);
        if (receiverSocket) {
            receiverSocket.emit('quicksend-incoming-request', {
                senderSocketId: socket.id,
                senderPseudo: socket.quickSendPseudo,
                fileName: data.fileName,
                fileSize: data.fileSize,
                fileType: data.fileType
            });
            console.log(`Quick Send: ${socket.quickSendPseudo} envoie une demande à ${receiverSocket.quickSendPseudo}`);
        }
    });

    // Accepter une demande de transfert
    socket.on('quicksend-accept-request', (data) => {
        const senderSocket = io.sockets.sockets.get(data.senderSocketId);
        if (senderSocket) {
            senderSocket.emit('quicksend-request-accepted', {
                receiverSocketId: socket.id,
                receiverPseudo: socket.quickSendPseudo
            });
            socket.emit('quicksend-transfer-start');
            console.log(`Quick Send: ${socket.quickSendPseudo} a accepté la demande de ${senderSocket.quickSendPseudo}`);
        }
    });

    // Refuser une demande de transfert
    socket.on('quicksend-refuse-request', (data) => {
        const senderSocket = io.sockets.sockets.get(data.senderSocketId);
        if (senderSocket) {
            senderSocket.emit('quicksend-request-refused', {
                receiverPseudo: socket.quickSendPseudo
            });
            console.log(`Quick Send: ${socket.quickSendPseudo} a refusé la demande de ${senderSocket.quickSendPseudo}`);
        }
    });

    // Envoyer un chunk de fichier
    socket.on('quicksend-send-chunk', (data) => {
        const receiverSocket = io.sockets.sockets.get(data.receiverSocketId);
        if (receiverSocket) {
            const progress = (data.offset / data.total) * 100;
            receiverSocket.emit('quicksend-file-chunk', {
                chunk: data.chunk,
                progress: progress,
                transferred: data.offset,
                total: data.total
            });
        }
    });

    // Transfert terminé
    socket.on('quicksend-transfer-complete', (data) => {
        const receiverSocket = io.sockets.sockets.get(data.receiverSocketId);
        if (receiverSocket) {
            receiverSocket.emit('quicksend-transfer-complete', {
                fileName: data.fileName,
                fileType: data.fileType
            });
            console.log(`Quick Send: Transfert terminé de ${socket.quickSendPseudo} vers ${receiverSocket.quickSendPseudo}`);

            // Mettre à jour les statistiques
            totalFilesSent++;
            saveStatsToMongoDB();
            broadcastStats();
        }
    });

    socket.on('disconnect', () => {
        console.log('Un utilisateur s\'est déconnecté', socket.id);

        // Notifier les autres utilisateurs si c'est un utilisateur Quick Send
        if (socket.quickSendRole) {
            console.log(`Quick Send: ${socket.quickSendPseudo} (${socket.quickSendRole}) s'est déconnecté`);

            // Si c'est un receiver, notifier les senders
            if (socket.quickSendRole === 'receiver') {
                io.sockets.sockets.forEach((sock) => {
                    if (sock.quickSendRole === 'sender') {
                        sock.emit('quicksend-receiver-disconnected');
                    }
                });
                // Mettre à jour la liste pour les senders restants
                broadcastQuickSendUsersList();
            }
        }

        cleanupSocketResources(socket.id);
        broadcastStats();
    });
});

// Fonction pour diffuser la liste des receivers à tous les senders
function broadcastQuickSendUsersList() {
    const receivers = [];
    io.sockets.sockets.forEach((sock) => {
        if (sock.quickSendRole === 'receiver') {
            receivers.push({
                socketId: sock.id,
                pseudo: sock.quickSendPseudo
            });
        }
    });

    // Envoyer la liste mise à jour à tous les senders
    io.sockets.sockets.forEach((sock) => {
        if (sock.quickSendRole === 'sender') {
            sock.emit('quicksend-users-list', receivers);
        }
    });

    console.log(`Quick Send: Liste des receivers mise à jour et diffusée (${receivers.length} en ligne)`);
}

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
    await mongoClient.close();
    process.exit();
});

process.on('SIGTERM', async () => {
    console.log('Arrêt du serveur, sauvegarde des statistiques...');
    await saveStatsToMongoDB();
    await mongoClient.close();
    process.exit();
}); 
