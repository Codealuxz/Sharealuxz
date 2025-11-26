// ========================================
// QUICK SEND MODULE
// ========================================

let quickSendSocket = null;
let quickSendMode = 'receiver'; // 'receiver' or 'sender'
let quickSendPseudo = '';
let quickSendSelectedFile = null;
let quickSendTargetUser = null;
let quickSendFileData = null;
let quickSendAutoConnected = false;
let quickSendRequestsBlocked = false;
let quickSendListenersSetup = false;

document.addEventListener('DOMContentLoaded', () => {
    initQuickSend();
});

function initQuickSend() {
    // Vérifier si un pseudo est déjà enregistré
    const savedPseudo = localStorage.getItem('quicksend_pseudo');

    // DEBUG: Afficher le localStorage
    console.log('=== Quick Send Init ===');
    console.log('localStorage quicksend_pseudo:', savedPseudo);
    console.log('localStorage quicksend_welcome_shown:', localStorage.getItem('quicksend_welcome_shown'));
    console.log('Tous les items localStorage:', {...localStorage});

    if (savedPseudo) {
        console.log('Pseudo trouvé, masquage du message de bienvenue');
        quickSendPseudo = savedPseudo;
        // Ne jamais afficher la demande de pseudo si on en a déjà un
        document.getElementById('quicksend-initial-pseudo').style.display = 'none';
        // Afficher le bouton "Envoyer à quelqu'un" ET le container receiver avec l'attente
        document.getElementById('quicksend-send-btn-container').style.display = 'block';
        document.getElementById('quicksend-receiver-container').style.display = 'block';
        // Enregistrer comme receiver et afficher l'interface d'attente
        registerAsReceiverWithUI(savedPseudo);
    } else {
        console.log('Pas de pseudo, affichage du message de bienvenue');
        // Pas de pseudo : afficher le message de bienvenue (seulement la première fois)
        document.getElementById('quicksend-initial-pseudo').style.display = 'flex';
    }

    // Gérer la validation du pseudo initial
    const initialPseudoBtn = document.getElementById('quicksend-initial-pseudo-btn');
    const initialPseudoInput = document.getElementById('quicksend-initial-pseudo-input');

    initialPseudoBtn.addEventListener('click', () => {
        const pseudo = initialPseudoInput.value.trim();
        console.log('=== Validation du pseudo ===');
        console.log('Pseudo saisi:', pseudo);

        if (pseudo) {
            // Sauvegarder le pseudo et marquer que le message de bienvenue a été vu
            localStorage.setItem('quicksend_pseudo', pseudo);
            localStorage.setItem('quicksend_welcome_shown', 'true');
            quickSendPseudo = pseudo;

            console.log('Pseudo sauvegardé dans localStorage');
            console.log('Tentative de masquage de quicksend-initial-pseudo');

            // Masquer la demande de pseudo (ne sera plus jamais affichée)
            document.getElementById('quicksend-initial-pseudo').style.display = 'none';

            // Afficher le bouton "Envoyer à quelqu'un" ET le container receiver
            document.getElementById('quicksend-send-btn-container').style.display = 'block';
            document.getElementById('quicksend-receiver-container').style.display = 'block';

            console.log('Bouton "Envoyer à quelqu\'un" affiché');

            // Enregistrer comme receiver et afficher l'interface d'attente
            registerAsReceiverWithUI(pseudo);
        } else {
            alert('Veuillez entrer un pseudo');
        }
    });

    initialPseudoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            initialPseudoBtn.click();
        }
    });

    // Bouton pour basculer en mode envoi
    document.getElementById('quicksend-switch-to-sender-btn').addEventListener('click', () => {
        switchToSenderMode();
    });

    // File selection
    const fileInput = document.getElementById('quicksend-file-input');
    const fileDrop = document.getElementById('quicksend-file-drop');
    const clearFileBtn = document.getElementById('quicksend-clear-file-btn');

    fileInput.addEventListener('change', (e) => {
        console.log('File input change event, files:', e.target.files.length);
        if (e.target.files.length > 0) {
            selectQuickSendFile(e.target.files[0]);
        }
    }, { once: false });

    fileDrop.addEventListener('click', () => {
        fileInput.click();
    });

    fileDrop.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDrop.classList.add('dragover');
    });

    fileDrop.addEventListener('dragleave', () => {
        fileDrop.classList.remove('dragover');
    });

    fileDrop.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDrop.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            selectQuickSendFile(e.dataTransfer.files[0]);
        }
    });

    clearFileBtn.addEventListener('click', () => {
        clearQuickSendFile();
    });

    // Accept/Refuse buttons
    document.getElementById('quicksend-accept-btn').addEventListener('click', acceptQuickSendRequest);
    document.getElementById('quicksend-refuse-btn').addEventListener('click', refuseQuickSendRequest);

    // Download button
    document.getElementById('quicksend-download-file-btn').addEventListener('click', downloadQuickSendFile);

    // Retry and send another buttons
    document.getElementById('quicksend-retry-btn').addEventListener('click', () => {
        showQuickSendSection('quicksend-users-list');
        hideQuickSendSection('quicksend-request-refused');
    });

    document.getElementById('quicksend-send-another-btn').addEventListener('click', () => {
        resetQuickSendSender();
    });

    // Bouton pour bloquer/débloquer les demandes
    document.getElementById('quicksend-block-requests-btn').addEventListener('click', () => {
        toggleBlockRequests();
    });
}

// Basculer le blocage des demandes
function toggleBlockRequests() {
    quickSendRequestsBlocked = !quickSendRequestsBlocked;

    const btn = document.getElementById('quicksend-block-requests-btn');
    const icon = btn.querySelector('i');

    if (quickSendRequestsBlocked) {
        // Mode bloqué
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Débloquer les demandes';
        btn.style.background = 'var(--error-color)';

        // Déconnecter du serveur
        if (socket && socket.connected) {
            socket.emit('quicksend-unregister');
        }

        // Mettre à jour le message
        document.querySelector('.quicksend-waiting h3').textContent = 'Demandes bloquées';
        document.querySelector('.quicksend-waiting .waiting-hint').textContent = 'Vous ne recevrez plus de demandes de fichiers';
        document.querySelector('.quicksend-waiting .fa-circle-notch').className = 'fas fa-ban';
    } else {
        // Mode débloqué
        btn.innerHTML = '<i class="fas fa-ban"></i> Bloquer les demandes';
        btn.style.background = '';

        // Se reconnecter au serveur
        if (socket && socket.connected && quickSendPseudo) {
            socket.emit('quicksend-register-receiver', { pseudo: quickSendPseudo });
        }

        // Remettre le message normal
        document.querySelector('.quicksend-waiting h3').textContent = 'En attente de réception...';
        document.querySelector('.quicksend-waiting .waiting-hint').textContent = 'Quelqu\'un peut maintenant vous envoyer un fichier';
        document.querySelector('.quicksend-waiting .fa-ban').className = 'fas fa-circle-notch fa-spin';
    }
}

// Enregistrer comme receiver avec l'UI d'attente
function registerAsReceiverWithUI(pseudo) {
    if (!socket || !socket.connected) {
        console.log('Socket pas encore connecté, réessai dans 500ms...');
        setTimeout(() => registerAsReceiverWithUI(pseudo), 500);
        return;
    }

    console.log('Enregistrement comme receiver:', pseudo);
    // Enregistrer comme receiver sur le serveur
    socket.emit('quicksend-register-receiver', { pseudo });

    // Afficher l'état d'attente avec le loader
    showQuickSendSection('quicksend-waiting');
    document.getElementById('quicksend-receiver-pseudo-display').textContent = pseudo;

    // Setup les listeners pour recevoir des fichiers
    setupReceiverListeners();
}

function switchToSenderMode() {
    // Déconnecter du mode receiver
    if (socket && socket.connected) {
        socket.emit('quicksend-unregister');
    }

    // Nettoyer les listeners receiver
    socket.off('quicksend-incoming-request');
    socket.off('quicksend-transfer-start');
    socket.off('quicksend-file-chunk');
    socket.off('quicksend-transfer-complete');
    socket.off('quicksend-sender-cancelled');

    // Masquer tout le container receiver et le bouton
    document.getElementById('quicksend-receiver-container').style.display = 'none';
    document.getElementById('quicksend-send-btn-container').style.display = 'none';

    // Afficher le container sender
    document.getElementById('quicksend-sender-container').style.display = 'block';

    // Enregistrer comme sender et afficher la sélection de fichier
    socket.emit('quicksend-register-sender', { pseudo: quickSendPseudo });
    showQuickSendSection('quicksend-file-selection');

    // Setup les listeners
    setupSenderListeners();
}

// ========================================
// RECEIVER MODE
// ========================================

function connectAsReceiver(pseudo) {
    quickSendPseudo = pseudo;

    if (!socket || !socket.connected) {
        console.log('Socket pas encore connecté, réessai dans 1 seconde...');
        setTimeout(() => connectAsReceiver(pseudo), 1000);
        return;
    }

    // Enregistrer comme receiver
    socket.emit('quicksend-register-receiver', { pseudo });

    // Afficher l'état d'attente
    showQuickSendSection('quicksend-waiting');
    document.getElementById('quicksend-receiver-pseudo-display').textContent = pseudo;

    // Écouter les événements (seulement une fois)
    if (!quickSendAutoConnected || quickSendMode === 'receiver') {
        setupReceiverListeners();
    }
}

function setupReceiverListeners() {
    console.log('setupReceiverListeners appelé, flag:', quickSendListenersSetup);

    // TOUJOURS nettoyer les anciens listeners AVANT tout check
    socket.off('quicksend-incoming-request');
    socket.off('quicksend-transfer-start');
    socket.off('quicksend-file-chunk');
    socket.off('quicksend-transfer-complete');
    socket.off('quicksend-sender-cancelled');

    if (quickSendListenersSetup) {
        console.log('Listeners déjà configurés, skip après nettoyage...');
        return;
    }

    quickSendListenersSetup = true;
    console.log('Configuration des listeners receiver...');

    socket.on('quicksend-incoming-request', (data) => {
        console.log('EVENT quicksend-incoming-request reçu:', data);
        // Ignorer les demandes si elles sont bloquées
        if (quickSendRequestsBlocked) {
            console.log('Demande ignorée (mode bloqué)');
            // Informer le sender que la demande a été refusée
            socket.emit('quicksend-refuse-request', { senderSocketId: data.senderSocketId });
            return;
        }

        // Masquer l'attente et afficher la demande
        hideQuickSendSection('quicksend-waiting');
        showQuickSendSection('quicksend-incoming-request');

        // Afficher les infos du sender
        document.getElementById('quicksend-sender-name').textContent = data.senderPseudo;
        document.getElementById('quicksend-incoming-filename').textContent = data.fileName;
        document.getElementById('quicksend-incoming-filesize').textContent = formatFileSize(data.fileSize);

        // Stocker les infos du sender
        quickSendTargetUser = data.senderSocketId;
    });

    socket.on('quicksend-transfer-start', () => {
        // Masquer la demande et afficher la progression
        hideQuickSendSection('quicksend-incoming-request');
        showQuickSendSection('quicksend-download-progress');
    });

    socket.on('quicksend-file-chunk', (data) => {
        // Recevoir les chunks et les assembler
        if (!quickSendFileData) {
            quickSendFileData = [];
        }
        quickSendFileData.push(data.chunk);

        // Mettre à jour la progression
        updateQuickSendProgress('receiver', data.progress, data.transferred, data.total);
    });

    socket.on('quicksend-transfer-complete', (data) => {
        // Assembler le fichier
        const blob = new Blob(quickSendFileData, { type: data.fileType });
        quickSendSelectedFile = {
            name: data.fileName,
            blob: blob
        };

        // Afficher le téléchargement terminé
        hideQuickSendSection('quicksend-download-progress');
        showQuickSendSection('quicksend-download-complete');
    });

    socket.on('quicksend-sender-cancelled', () => {
        alert('L\'expéditeur a annulé le transfert.');
        resetQuickSendReceiver();
    });
}

function acceptQuickSendRequest() {
    socket.emit('quicksend-accept-request', { senderSocketId: quickSendTargetUser });
}

function refuseQuickSendRequest() {
    socket.emit('quicksend-refuse-request', { senderSocketId: quickSendTargetUser });
    resetQuickSendReceiver();
}

function downloadQuickSendFile() {
    if (quickSendSelectedFile) {
        const url = URL.createObjectURL(quickSendSelectedFile.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = quickSendSelectedFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Réinitialiser après téléchargement
        setTimeout(() => {
            resetQuickSendReceiver();
        }, 1000);
    }
}

function resetQuickSendReceiver() {
    // Réinitialiser les variables
    quickSendTargetUser = null;
    quickSendFileData = null;
    quickSendSelectedFile = null;

    // Réinitialiser l'UI
    hideQuickSendSection('quicksend-incoming-request');
    hideQuickSendSection('quicksend-download-progress');
    hideQuickSendSection('quicksend-download-complete');

    // Réafficher l'état d'attente
    showQuickSendSection('quicksend-waiting');

    // Se reconnecter comme receiver
    if (socket && socket.connected && quickSendPseudo) {
        socket.emit('quicksend-register-receiver', { pseudo: quickSendPseudo });
    }
}

// ========================================
// SENDER MODE
// ========================================

function connectAsSender(pseudo) {
    quickSendPseudo = pseudo;

    if (!socket || !socket.connected) {
        alert('Erreur de connexion au serveur. Veuillez rafraîchir la page.');
        return;
    }

    // Enregistrer comme sender
    socket.emit('quicksend-register-sender', { pseudo });

    // Afficher la sélection de fichier et la liste des utilisateurs
    document.querySelector('#quicksend-sender-container .pseudo-input-section').hidden = true;
    showQuickSendSection('quicksend-file-selection');

    // Écouter les événements
    setupSenderListeners();
}

function setupSenderListeners() {
    // Nettoyer les anciens listeners avant d'en ajouter de nouveaux
    socket.off('quicksend-users-list');
    socket.off('quicksend-request-accepted');
    socket.off('quicksend-request-refused');
    socket.off('quicksend-receiver-disconnected');

    // Liste des utilisateurs en ligne
    socket.on('quicksend-users-list', (users) => {
        updateQuickSendUsersList(users);
    });

    socket.on('quicksend-request-accepted', (data) => {
        // Le receiver a accepté, démarrer le transfert
        hideQuickSendSection('quicksend-sender-waiting');
        showQuickSendSection('quicksend-upload-progress');
        document.getElementById('quicksend-recipient-name').textContent = data.receiverPseudo;

        // Envoyer le fichier
        sendQuickSendFile(data.receiverSocketId);
    });

    socket.on('quicksend-request-refused', (data) => {
        // Le receiver a refusé
        hideQuickSendSection('quicksend-sender-waiting');
        showQuickSendSection('quicksend-request-refused');
        document.getElementById('quicksend-refused-user').textContent = data.receiverPseudo;
    });

    socket.on('quicksend-receiver-disconnected', () => {
        alert('Le destinataire s\'est déconnecté.');
        showQuickSendSection('quicksend-users-list');
        hideQuickSendSection('quicksend-sender-waiting');
        hideQuickSendSection('quicksend-upload-progress');
    });
}

function selectQuickSendFile(file) {
    console.log('selectQuickSendFile appelé avec:', file.name);
    quickSendSelectedFile = file;

    // Afficher le fichier sélectionné
    document.getElementById('quicksend-file-drop').parentElement.querySelector('.file-drop-area').hidden = true;
    showQuickSendSection('quicksend-selected-file');

    document.getElementById('quicksend-selected-filename').textContent = file.name;
    document.getElementById('quicksend-selected-filesize').textContent = formatFileSize(file.size);

    // Afficher la liste des utilisateurs
    showQuickSendSection('quicksend-users-list');

    // Demander la liste des utilisateurs
    console.log('Envoi de quicksend-request-users-list');
    socket.emit('quicksend-request-users-list');
}

function clearQuickSendFile() {
    quickSendSelectedFile = null;

    document.getElementById('quicksend-file-drop').parentElement.querySelector('.file-drop-area').hidden = false;
    hideQuickSendSection('quicksend-selected-file');
    hideQuickSendSection('quicksend-users-list');

    document.getElementById('quicksend-file-input').value = '';
}

function updateQuickSendUsersList(users) {
    const container = document.getElementById('quicksend-users-container');

    if (users.length === 0) {
        container.innerHTML = '<p class="no-users-message">Aucun utilisateur en ligne pour le moment...</p>';
        return;
    }

    container.innerHTML = '';
    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        userCard.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${user.pseudo.charAt(0).toUpperCase()}</div>
                <div>
                    <div class="user-name">${user.pseudo}</div>
                    <div class="user-status">
                        <i class="fas fa-circle"></i>
                        En ligne
                    </div>
                </div>
            </div>
        `;

        userCard.addEventListener('click', () => {
            if (quickSendSelectedFile) {
                sendQuickSendRequest(user);
            }
        });

        container.appendChild(userCard);
    });
}

function sendQuickSendRequest(user) {
    quickSendTargetUser = user.socketId;

    // Envoyer la demande au receiver
    socket.emit('quicksend-send-request', {
        receiverSocketId: user.socketId,
        fileName: quickSendSelectedFile.name,
        fileSize: quickSendSelectedFile.size,
        fileType: quickSendSelectedFile.type
    });

    // Afficher l'attente de réponse
    hideQuickSendSection('quicksend-users-list');
    showQuickSendSection('quicksend-sender-waiting');
    document.getElementById('quicksend-target-user').textContent = user.pseudo;
}

function sendQuickSendFile(receiverSocketId) {
    const chunkSize = 64 * 1024; // 64 KB par chunk
    const fileReader = new FileReader();
    let offset = 0;

    const readNextChunk = () => {
        const slice = quickSendSelectedFile.slice(offset, offset + chunkSize);
        fileReader.readAsArrayBuffer(slice);
    };

    fileReader.onload = (e) => {
        const chunk = e.target.result;

        socket.emit('quicksend-send-chunk', {
            receiverSocketId: receiverSocketId,
            chunk: chunk,
            offset: offset,
            total: quickSendSelectedFile.size
        });

        offset += chunk.byteLength;

        // Mettre à jour la progression
        const progress = (offset / quickSendSelectedFile.size) * 100;
        updateQuickSendProgress('sender', progress, offset, quickSendSelectedFile.size);

        if (offset < quickSendSelectedFile.size) {
            readNextChunk();
        } else {
            // Transfert terminé
            socket.emit('quicksend-transfer-complete', {
                receiverSocketId: receiverSocketId,
                fileName: quickSendSelectedFile.name,
                fileType: quickSendSelectedFile.type
            });

            hideQuickSendSection('quicksend-upload-progress');
            showQuickSendSection('quicksend-upload-complete');
        }
    };

    readNextChunk();
}

function resetQuickSendSender() {
    // Réinitialiser les variables
    quickSendTargetUser = null;
    quickSendSelectedFile = null;

    // Nettoyer les listeners sender
    socket.off('quicksend-users-list');
    socket.off('quicksend-request-accepted');
    socket.off('quicksend-request-refused');
    socket.off('quicksend-receiver-disconnected');

    // Réinitialiser le flag pour permettre la recréation des listeners receiver
    quickSendListenersSetup = false;

    // Masquer le container sender
    document.getElementById('quicksend-sender-container').style.display = 'none';

    // Réafficher le mode receiver
    document.getElementById('quicksend-receiver-container').style.display = 'block';
    document.getElementById('quicksend-send-btn-container').style.display = 'block';

    // Réinitialiser l'UI sender
    hideQuickSendSection('quicksend-file-selection');
    hideQuickSendSection('quicksend-users-list');
    hideQuickSendSection('quicksend-sender-waiting');
    hideQuickSendSection('quicksend-upload-progress');
    hideQuickSendSection('quicksend-upload-complete');
    hideQuickSendSection('quicksend-request-refused');

    clearQuickSendFile();

    // Se reconnecter comme receiver
    if (socket && socket.connected && quickSendPseudo) {
        socket.emit('quicksend-register-receiver', { pseudo: quickSendPseudo });
        showQuickSendSection('quicksend-waiting');
        // Reconfigurer les listeners receiver
        setupReceiverListeners();
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function showQuickSendSection(sectionClass) {
    const section = document.querySelector('.' + sectionClass);
    if (section) {
        section.hidden = false;
    }
}

function hideQuickSendSection(sectionClass) {
    const section = document.querySelector('.' + sectionClass);
    if (section) {
        section.hidden = true;
    }
}

function updateQuickSendProgress(mode, progress, transferred, total) {
    const prefix = mode === 'receiver' ? 'quicksend-receiver' : 'quicksend-sender';

    const progressFill = document.getElementById(`${prefix}-progress-fill`);
    const progressPercentage = document.getElementById(`${prefix}-progress-percentage`);
    const progressTransferred = document.getElementById(`${prefix}-progress-transferred`);

    if (progressFill) {
        progressFill.style.width = progress + '%';
    }

    if (progressPercentage) {
        progressPercentage.textContent = Math.round(progress) + '%';
    }

    if (progressTransferred) {
        progressTransferred.textContent = `${formatFileSize(transferred)} / ${formatFileSize(total)}`;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
