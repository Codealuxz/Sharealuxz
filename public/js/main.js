// Variable globale pour le mode dark/light
var mode = localStorage.getItem('mode') || 'light';

document.addEventListener('DOMContentLoaded', () => {

    // Notification de migration vers la nouvelle URL (uniquement sur l'ancienne URL)
    if (window.location.hostname === 'sharealuxz.codealuxz.fr') {
        const migrationNotif = document.createElement('div');
        migrationNotif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ff754b, #ee9a3a);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10001;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            animation: slideInRight 0.5s ease;
            max-width: 350px;
            transition: transform 0.3s ease, opacity 0.3s ease;
        `;
        migrationNotif.innerHTML = `
            <i class="fas fa-info-circle" style="font-size: 1.5em;"></i>
            <div>
                <div style="font-size: 1.1em; margin-bottom: 0.25rem;">Nouvelle URL disponible !</div>
                <div style="font-size: 0.9em; opacity: 0.95;">Cliquez pour accéder à sharealuxz.fr</div>
            </div>
        `;

        // Animation CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        migrationNotif.addEventListener('click', () => {
            window.location.href = 'https://sharealuxz.fr';
        });

        migrationNotif.addEventListener('mouseenter', () => {
            migrationNotif.style.transform = 'scale(1.05)';
        });

        migrationNotif.addEventListener('mouseleave', () => {
            migrationNotif.style.transform = 'scale(1)';
        });

        document.body.appendChild(migrationNotif);

        // Masquer après 5 secondes
        setTimeout(() => {
            migrationNotif.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => {
                migrationNotif.remove();
            }, 500);
        }, 5000);
    }

    // Vérifier si l'utilisateur a accepté les conditions
    const hasAcceptedTerms = localStorage.getItem('sharealuxz_terms_accepted');
    const termsModal = document.getElementById('terms-modal');
    const acceptTermsBtn = document.getElementById('accept-terms');
    const declineTermsBtn = document.getElementById('decline-terms');
    const termsPrivacyLink = document.getElementById('terms-privacy-link');

    // Afficher la popup si les conditions n'ont pas été acceptées
    if (!hasAcceptedTerms) {
        termsModal.style.display = 'flex';

        // Bloquer l'utilisation du site tant que non accepté
        document.body.style.overflow = 'hidden';
    }

    // Gérer l'acceptation
    acceptTermsBtn.addEventListener('click', () => {
        localStorage.setItem('sharealuxz_terms_accepted', 'true');
        termsModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });

    // Gérer le refus
    declineTermsBtn.addEventListener('click', () => {
        alert('Vous devez accepter les conditions d\'utilisation pour utiliser ce service.');
    });

    // Ouvrir la politique de confidentialité depuis la popup des conditions
    termsPrivacyLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('privacy-modal').style.display = 'flex';
    });


    setTimeout(() => {

        const urlParams = new URLSearchParams(window.location.search);
        const codeFromUrl = urlParams.get('code');

        if (codeFromUrl) {

            document.querySelector('.tab-btn[data-tab="receive"]').click();


            setCodeValue(codeFromUrl);


            document.getElementById('connect-btn').click();
        }

    }, 1000); 

    const socket = io({
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1,
        reconnectionDelayMax: 5000,
        timeout: 180000,
        forceNew: false,
        transports: ['websocket', 'polling']
    });

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    const fileInput = document.getElementById('file-input');
    const folderInput = document.getElementById('folder-input');
    const tktcr = document.getElementById('tktcr')
    const cancel = document.getElementById('cancel-file')
    const fileDropArea = document.querySelector('.file-drop-area');
    const fileInfo = document.querySelector('.file-info');
    const previewContainer = document.querySelector('.preview-container');
    const fileCount = document.querySelector('.file-count');
    const fileSize = document.querySelector('.file-size');
    const startSendBtn = document.getElementById('start-send-btn');
    const codeContainer = document.querySelector('.code-container');
    const transferCode = document.getElementById('transfer-code');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    const transferStatus = document.querySelector('.transfer-status');
    const connectionStatus = document.querySelector('.connection-status');
    const shareLinkBtn = document.getElementById('share-link-btn');
    const qrCodeBtn = document.getElementById('qr-code-btn');
    const qrModal = document.getElementById('qr-modal');
    const closeQrBtn = document.getElementById('close-qr');

    // Éléments pour le transfert de texte
    const typeBtns = document.querySelectorAll('.type-btn');
    const fileContainer = document.getElementById('file-container');
    const textContainer = document.getElementById('text-container');
    const textInput = document.getElementById('text-input');
    const pasteFromClipboardBtn = document.getElementById('paste-from-clipboard-btn');
    const clearTextBtn = document.getElementById('clear-text-btn');
    const textCharCount = document.getElementById('text-char-count');
    const textReceiveArea = document.querySelector('.text-receive-area');
    const receivedTextPreview = document.getElementById('received-text-preview');
    const receivedTextCharCount = document.getElementById('received-text-char-count');
    const copyTextBtn = document.getElementById('copy-text-btn');
    const downloadTextBtn = document.getElementById('download-text-btn');

    let currentTransferType = 'file'; // 'file' ou 'text'
    let textContent = '';

    const codeDigits = document.querySelectorAll('.code-digit');
    const connectBtn = document.getElementById('connect-btn');
    const receiveStatus = document.querySelector('.receive-status');
    const fileInfoReceive = document.querySelector('.file-info-receive');
    const incomingFileName = document.querySelector('.incoming-file-name');
    const incomingFileSize = document.querySelector('.incoming-file-size');
    const acceptReceiveBtn = document.getElementById('accept-receive-btn');
    const cancelReceiveBtn = document.getElementById('cancel-receive-btn');
    const downloadBtn = document.getElementById('download-btn');

    const progressContainers = document.querySelectorAll('.progress-container');
    const progressBars = document.querySelectorAll('.progress-fill');
    const progressPercentages = document.querySelectorAll('.progress-percentage');
    const progressTransferred = document.querySelectorAll('.progress-transferred');

    // Gestion des cases de code
    function getCodeValue() {
        return Array.from(codeDigits).map(input => input.value).join('');
    }

    function setCodeValue(code) {
        const digits = code.toString().padStart(8, '0').split('');
        codeDigits.forEach((input, index) => {
            input.value = digits[index] || '';
        });
    }

    // Navigation entre les cases
    codeDigits.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;

            // Autoriser uniquement les chiffres
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }

            // Si on a saisi un chiffre, passer à la case suivante
            if (value && index < codeDigits.length - 1) {
                codeDigits[index + 1].focus();
            }

            // Auto-submit si tous les chiffres sont remplis
            if (index === codeDigits.length - 1 && value) {
                const code = getCodeValue();
                if (code.length === 8) {
                    setTimeout(() => connectBtn.click(), 100);
                }
            }
        });

        input.addEventListener('keydown', (e) => {
            // Backspace : effacer et retourner à la case précédente
            if (e.key === 'Backspace' && !input.value && index > 0) {
                codeDigits[index - 1].focus();
                codeDigits[index - 1].value = '';
            }

            // Flèche gauche : case précédente
            if (e.key === 'ArrowLeft' && index > 0) {
                codeDigits[index - 1].focus();
            }

            // Flèche droite : case suivante
            if (e.key === 'ArrowRight' && index < codeDigits.length - 1) {
                codeDigits[index + 1].focus();
            }
        });

        // Sélectionner le contenu au focus
        input.addEventListener('focus', () => {
            input.select();
        });

        // Support du copier-coller
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
            setCodeValue(pastedData);
            if (pastedData.length === 8) {
                codeDigits[7].focus();
            }
        });
    });

    let selectedFiles = [];
    let isFolder = false;
    let totalSize = 0;
    let receiverConnection = null;
    let senderConnection = null;
    let fileBuffer = [];
    let receivedSize = 0;
    let fileBlob = null;
    // Taille optimisée des chunks pour un meilleur débit (2 MB au lieu de 1 MB)
    const CHUNK_SIZE = 2 * 1024 * 1024;
    // Nombre de chunks parallèles augmenté pour saturer la bande passante
    const MAX_PARALLEL_CHUNKS = 12;


    let downloadStartTime = 0;
    let downloadLastUpdate = 0;
    let downloadSpeeds = [];
    let downloadTimeElement = null;


    let wasDisconnected = false;
    let disconnectionTime = 0;

    // Variable pour suivre si un transfert est en cours
    let isTransferActive = false;

    // Protection contre la fermeture de la page pendant un transfert
    window.addEventListener('beforeunload', function(e) {
        if (isTransferActive) {
            e.preventDefault();
            e.returnValue = 'Un transfert est en cours. Si vous quittez maintenant, le transfert sera interrompu.';
            return e.returnValue;
        }
    });

    // Fonction pour afficher/masquer la notification de transfert actif
    function showTransferWarning(show = true) {
        let warningBanner = document.getElementById('transfer-warning-banner');

        if (show) {
            if (!warningBanner) {
                warningBanner = document.createElement('div');
                warningBanner.id = 'transfer-warning-banner';
                warningBanner.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(135deg, #ff754b, #ee9a3a);
                    color: white;
                    padding: 0.75rem 1rem;
                    text-align: center;
                    font-weight: 600;
                    z-index: 10000;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    animation: slideDown 0.3s ease;
                `;
                warningBanner.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="font-size: 1.2em;"></i>
                    <span>Transfert en cours - Ne quittez pas cette page pour que l'autre reçoive le fichier</span>
                `;
                document.body.appendChild(warningBanner);

                // Ajouter du padding au body pour compenser la bannière
                document.body.style.paddingTop = '48px';
            }
            warningBanner.style.display = 'flex';
        } else {
            if (warningBanner) {
                warningBanner.style.display = 'none';
                document.body.style.paddingTop = '0';
            }
        }
    }

    // Extensions de fichiers potentiellement dangereux
    const DANGEROUS_EXTENSIONS = [
        '.exe', '.msi', '.app', '.deb', '.rpm', '.dmg',
        '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar',
        '.php', '.jsp', '.asp', '.aspx', '.py', '.rb', '.pl',
        '.scr', '.com', '.pif', '.reg', '.vb',
        '.docm', '.xlsm', '.pptm', '.dotm', '.xltm'
    ];

    function getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';
    }

    function isDangerousFile(filename) {
        const ext = getFileExtension(filename);
        return DANGEROUS_EXTENSIONS.includes(ext);
    }

    // Fonction pour supprimer le paramètre code de l'URL
    function removeCodeFromUrl() {
        const url = new URL(window.location.href);
        if (url.searchParams.has('code')) {
            url.searchParams.delete('code');
            window.history.replaceState({}, '', url.pathname + url.search);
        }
    }

    // Fonction pour vérifier si c'est un fichier ZIP
    function isZipFile(filename) {
        const ext = getFileExtension(filename);
        return ext === '.zip';
    }

    // Fonction pour afficher le contenu d'un ZIP
    async function showZipContent(blob, filename) {
        return new Promise(async (resolve) => {
            const zipModal = document.getElementById('zip-content-modal');
            const zipContentList = document.getElementById('zip-content-list');
            const confirmBtn = document.getElementById('confirm-download-zip');
            const cancelBtn = document.getElementById('cancel-download-zip');
            const closeBtn = document.getElementById('close-zip-modal');

            try {
                // Lire le contenu du ZIP
                const zip = await JSZip.loadAsync(blob);

                // Créer la liste des fichiers
                let fileList = '<div style="font-size:0.9em;">';
                let fileCount = 0;
                let totalSize = 0;
                let dangerousFiles = [];

                // Parcourir tous les fichiers du ZIP
                for (const [path, zipEntry] of Object.entries(zip.files)) {
                    if (!zipEntry.dir) {
                        fileCount++;
                        totalSize += zipEntry._data ? zipEntry._data.uncompressedSize : 0;

                        const icon = getFileIcon(path);
                        const size = formatFileSize(zipEntry._data ? zipEntry._data.uncompressedSize : 0);
                        const isDangerous = isDangerousFile(path);

                        if (isDangerous) {
                            dangerousFiles.push(path);
                        }

                        const warningBadge = isDangerous ? '<span style="background:var(--error-color);color:white;padding:0.2em 0.5em;border-radius:4px;font-size:0.75em;margin-left:0.5em;">DANGER</span>' : '';

                        fileList += `
                            <div style="display:flex;align-items:center;gap:0.8rem;padding:0.6rem;border-bottom:1px solid var(--border-color);${isDangerous ? 'background:rgba(255,0,0,0.05);' : ''}">
                                <i class="fas ${icon}" style="color:${isDangerous ? 'var(--error-color)' : 'var(--primary-color)'};width:20px;"></i>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${isDangerous ? 'color:var(--error-color);' : ''}">${path}${warningBadge}</div>
                                    <div style="font-size:0.85em;color:var(--light-text);">${size}</div>
                                </div>
                            </div>
                        `;
                    }
                }

                fileList += '</div>';

                // Ajouter un avertissement si fichiers dangereux
                let warningSection = '';
                if (dangerousFiles.length > 0) {
                    warningSection = `
                        <div style="background:rgba(255,0,0,0.1);border:2px solid var(--error-color);padding:1rem;border-radius:8px;margin-bottom:1rem;">
                            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
                                <i class="fas fa-exclamation-triangle" style="color:var(--error-color);font-size:1.2em;"></i>
                                <div style="font-weight:600;color:var(--error-color);">ATTENTION : Fichiers dangereux détectés</div>
                            </div>
                            <div style="font-size:0.9em;color:var(--text-color);">
                                Cette archive contient ${dangerousFiles.length} fichier(s) potentiellement dangereux (${dangerousFiles.slice(0, 3).join(', ')}${dangerousFiles.length > 3 ? '...' : ''}).
                                <br><strong>N'exécutez ces fichiers que si vous faites confiance à la source.</strong>
                            </div>
                        </div>
                    `;
                }

                // Ajouter un résumé en haut
                const summary = `
                    <div style="background:var(--background-color);padding:1rem;border-radius:8px;margin-bottom:1rem;text-align:center;">
                        <div style="font-size:1.1em;font-weight:600;color:var(--primary-color);margin-bottom:0.5rem;">${filename}</div>
                        <div style="font-size:0.9em;color:var(--light-text);">
                            <i class="fas fa-file-archive"></i> ${fileCount} fichier(s) - ${formatFileSize(totalSize)} au total
                        </div>
                    </div>
                `;

                zipContentList.innerHTML = summary + warningSection + fileList;
                zipModal.style.display = 'flex';

                // Gestion des événements
                const handleConfirm = () => {
                    cleanup();
                    resolve(true);
                };

                const handleCancel = () => {
                    cleanup();
                    resolve(false);
                };

                const cleanup = () => {
                    confirmBtn.removeEventListener('click', handleConfirm);
                    cancelBtn.removeEventListener('click', handleCancel);
                    closeBtn.removeEventListener('click', handleCancel);
                    zipModal.style.display = 'none';
                };

                confirmBtn.addEventListener('click', handleConfirm);
                cancelBtn.addEventListener('click', handleCancel);
                closeBtn.addEventListener('click', handleCancel);

            } catch (error) {
                console.error('Erreur lors de la lecture du ZIP:', error);
                zipContentList.innerHTML = `
                    <div style="text-align:center;color:var(--error-color);padding:2rem;">
                        <i class="fas fa-exclamation-triangle" style="font-size:2em;margin-bottom:1rem;"></i>
                        <div>Impossible de lire le contenu de l'archive</div>
                    </div>
                `;
                zipModal.style.display = 'flex';

                const handleClose = () => {
                    closeBtn.removeEventListener('click', handleClose);
                    cancelBtn.removeEventListener('click', handleClose);
                    zipModal.style.display = 'none';
                    resolve(false);
                };

                closeBtn.addEventListener('click', handleClose);
                cancelBtn.addEventListener('click', handleClose);
            }
        });
    }

    // Fonction pour obtenir l'icône appropriée selon l'extension
    function getFileIcon(filename) {
        const ext = getFileExtension(filename);
        const iconMap = {
            '.pdf': 'fa-file-pdf',
            '.doc': 'fa-file-word', '.docx': 'fa-file-word',
            '.xls': 'fa-file-excel', '.xlsx': 'fa-file-excel',
            '.ppt': 'fa-file-powerpoint', '.pptx': 'fa-file-powerpoint',
            '.zip': 'fa-file-archive', '.rar': 'fa-file-archive', '.7z': 'fa-file-archive',
            '.jpg': 'fa-file-image', '.jpeg': 'fa-file-image', '.png': 'fa-file-image', '.gif': 'fa-file-image',
            '.mp4': 'fa-file-video', '.avi': 'fa-file-video', '.mov': 'fa-file-video',
            '.mp3': 'fa-file-audio', '.wav': 'fa-file-audio',
            '.txt': 'fa-file-alt', '.md': 'fa-file-alt',
            '.js': 'fa-file-code', '.html': 'fa-file-code', '.css': 'fa-file-code', '.php': 'fa-file-code',
        };
        return iconMap[ext] || 'fa-file';
    }

    // Fonction pour formater la taille de fichier
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    function showFileWarning(filename, fileSize, onAccept, onCancel) {
        return new Promise((resolve) => {
            const ext = getFileExtension(filename);

            const modal = document.createElement('div');
            modal.className = 'file-warning-modal';
            modal.innerHTML = `
                <div class="file-warning-content">
                    <div class="file-warning-icon">⚠️</div>
                    <div class="file-warning-title">Fichier potentiellement dangereux</div>
                    <div class="file-warning-details">
                        <strong>Fichier :</strong> ${filename}<br>
                        <strong>Taille :</strong> ${fileSize}<br>
                        <strong>Extension :</strong> ${ext}
                    </div>
                    <div class="file-warning-message">
                        Ce type de fichier peut contenir des virus ou malwares. Ne téléchargez que si vous faites confiance à l'expéditeur.
                    </div>
                    <div class="file-warning-buttons">
                        <button class="file-warning-cancel">Annuler</button>
                        <button class="file-warning-accept">Continuer</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.querySelector('.file-warning-accept').onclick = () => {
                document.body.removeChild(modal);
                resolve(true);
                if (onAccept) onAccept();
            };

            modal.querySelector('.file-warning-cancel').onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
                if (onCancel) onCancel();
            };
        });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function resetSendUI() {
        selectedFiles = [];
        textContent = '';
        currentTransferType = 'file';
        isFolder = false;
        totalSize = 0;
        receiverConnection = null;

        fileInfo.hidden = true;
        fileDropArea.hidden = false;
        fileDropArea.style.display = 'flex';
        startSendBtn.disabled = true;
        startSendBtn.hidden = false;
        codeContainer.hidden = true;
        transferStatus.hidden = true;
        connectionStatus.className = 'connection-status waiting';
        connectionStatus.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i><span>En attente de connexion...</span>';
        progressBars[0].style.width = '0%';
        progressPercentages[0].textContent = '0%';
        progressTransferred[0].textContent = '0 MB / 0 MB';
        progressContainers[0].hidden = true;
        previewContainer.innerHTML = '';

        // Réafficher le sélecteur de type et les conteneurs
        const transferTypeSelector = document.querySelector('.transfer-type-selector');
        if (transferTypeSelector) {
            transferTypeSelector.style.display = 'flex';
        }
        if (fileContainer) {
            fileContainer.style.display = 'block';
        }
        if (textContainer) {
            textContainer.style.display = 'block';
        }

        // Réinitialiser le conteneur de texte
        if (textInput) {
            textInput.value = '';
            textCharCount.textContent = '0 caractères';
        }

        // Désactiver la protection de fermeture de page
        isTransferActive = false;
        showTransferWarning(false);

        // Recharger la page après 2 secondes
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }

    function resetReceiveUI() {
        receiveStatus.hidden = true;
        fileInfoReceive.hidden = true;
        acceptReceiveBtn.hidden = true;
        cancelReceiveBtn.hidden = true;
        downloadBtn.hidden = true;
        codeDigits.forEach(input => {
            input.value = '';
            input.disabled = false;
        });
        connectBtn.disabled = false;
        progressBars[1].style.width = '0%';
        progressPercentages[1].textContent = '0%';
        progressTransferred[1].textContent = '0 MB / 0 MB';
        progressContainers[1].hidden = true;

        // Réafficher le conteneur de saisie du code
        const codeInputContainer = document.querySelector('.code-input-container');
        if (codeInputContainer) {
            codeInputContainer.style.display = 'block';
        }

        fileBuffer = [];
        receivedSize = 0;
        fileBlob = null;


        resetDownloadTimeDisplay();

        // Désactiver la protection de fermeture de page
        isTransferActive = false;
        showTransferWarning(false);

        // Supprimer le code de l'URL si présent
        removeCodeFromUrl();
    }

    // Fonction pour changer d'onglet
    function switchTab(tabId) {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        const targetBtn = Array.from(tabBtns).find(b => b.getAttribute('data-tab') === tabId);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        const targetContent = document.getElementById(tabId);
        if (targetContent) {
            targetContent.classList.add('active');
        }

        // Mettre à jour l'URL sans recharger la page
        const url = new URL(window.location);
        url.searchParams.set('tab', tabId);
        window.history.pushState({}, '', url);
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Au chargement, vérifier l'URL pour l'onglet actif
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    if (tabFromUrl && (tabFromUrl === 'send' || tabFromUrl === 'receive')) {
        switchTab(tabFromUrl);
    }

    // Gestion du changement de type de transfert
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Retirer la classe active de tous les boutons
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentTransferType = btn.getAttribute('data-type');

            // Afficher/masquer les conteneurs appropriés
            if (currentTransferType === 'file') {
                fileContainer.hidden = false;
                textContainer.hidden = true;
                startSendBtn.disabled = selectedFiles.length === 0;
            } else {
                fileContainer.hidden = true;
                textContainer.hidden = false;
                startSendBtn.disabled = textContent.trim() === '';
            }
        });
    });

    // Gestion de la saisie de texte
    if (textInput) {
        textInput.addEventListener('input', () => {
            textContent = textInput.value;
            textCharCount.textContent = `${textContent.length} caractères`;
            startSendBtn.disabled = textContent.trim() === '';
        });
    }

    // Bouton coller depuis le presse-papiers
    if (pasteFromClipboardBtn) {
        pasteFromClipboardBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                textInput.value = text;
                textContent = text;
                textCharCount.textContent = `${textContent.length} caractères`;
                startSendBtn.disabled = textContent.trim() === '';
            } catch (err) {
                console.error('Erreur lors de la lecture du presse-papiers:', err);
                alert('Impossible de lire le presse-papiers. Assurez-vous d\'avoir donné les permissions nécessaires.');
            }
        });
    }

    // Bouton effacer le texte
    if (clearTextBtn) {
        clearTextBtn.addEventListener('click', () => {
            textInput.value = '';
            textContent = '';
            textCharCount.textContent = '0 caractères';
            startSendBtn.disabled = true;
        });
    }

    // Boutons de réception de texte
    if (copyTextBtn) {
        copyTextBtn.addEventListener('click', async () => {
            try {
                const textToCopy = receivedTextPreview.textContent;
                await navigator.clipboard.writeText(textToCopy);
                copyTextBtn.innerHTML = '<i class="fas fa-check"></i> Copié !';
                setTimeout(() => {
                    copyTextBtn.innerHTML = '<i class="fas fa-copy"></i> Copier dans le presse-papiers';
                }, 2000);
            } catch (err) {
                console.error('Erreur lors de la copie:', err);
                alert('Impossible de copier dans le presse-papiers.');
            }
        });
    }

    if (downloadTextBtn) {
        downloadTextBtn.addEventListener('click', () => {
            const textToDownload = receivedTextPreview.textContent;
            const blob = new Blob([textToDownload], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `texte-sharealuxz-${Date.now()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(Array.from(e.target.files), false);
        }
    });

    folderInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(Array.from(e.target.files), true);
        }
    });

    // Zone de drop plein écran
    const fullscreenDropZone = document.getElementById('fullscreen-drop-zone');
    let dragCounter = 0;

    // Afficher la zone fullscreen quand on commence à drag
    document.addEventListener('dragenter', (e) => {
        // Uniquement si on est dans l'onglet "Envoyer"
        const sendTab = document.getElementById('send');
        if (!sendTab.classList.contains('active')) return;

        dragCounter++;
        if (dragCounter === 1) {
            fullscreenDropZone.classList.add('active');
        }
    });

    document.addEventListener('dragleave', (e) => {
        dragCounter--;
        if (dragCounter === 0) {
            fullscreenDropZone.classList.remove('active');
        }
    });

    // Empêcher le comportement par défaut sur toute la page
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    // Gérer le drop sur la zone fullscreen
    fullscreenDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        fullscreenDropZone.classList.remove('active');

        const items = e.dataTransfer.items;
        if (items) {
            let hasFolder = false;
            for (let i = 0; i < items.length; i++) {
                const item = items[i].webkitGetAsEntry();
                if (item && item.isDirectory) {
                    hasFolder = true;
                    break;
                }
            }

            if (hasFolder) {
                processFolderDrop(e.dataTransfer);
            } else {
                const files = Array.from(e.dataTransfer.files);
                handleFileSelection(files);
            }
        }
    });

    fileDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropArea.classList.add('active');
    });

    fileDropArea.addEventListener('dragleave', () => {
        fileDropArea.classList.remove('active');
    });

    fileDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropArea.classList.remove('active');

        const items = e.dataTransfer.items;
        if (items) {

            let hasFolder = false;
            for (let i = 0; i < items.length; i++) {
                const item = items[i].webkitGetAsEntry();
                if (item && item.isDirectory) {
                    hasFolder = true;
                    break;
                }
            }

            if (hasFolder) {

                processFolderDrop(e.dataTransfer);
            } else if (e.dataTransfer.files.length > 0) {

                handleFileSelection(Array.from(e.dataTransfer.files), false);
            }
        }
    });

    async function processFolderDrop(dataTransfer) {
        const items = dataTransfer.items;
        const files = [];

        for (let i = 0; i < items.length; i++) {
            const entry = items[i].webkitGetAsEntry();
            if (entry) {
                await traverseFileTree(entry, '', files);
            }
        }

        if (files.length > 0) {
            handleFileSelection(files, true);
        }
    }

    function traverseFileTree(item, path, files) {
        return new Promise(resolve => {
            if (item.isFile) {
                item.file(file => {
                    file.relativePath = path + file.name;
                    files.push(file);
                    resolve();
                });
            } else if (item.isDirectory) {
                const dirReader = item.createReader();
                const readEntries = () => {
                    dirReader.readEntries(async entries => {
                        if (entries.length > 0) {
                            const promises = [];
                            for (let i = 0; i < entries.length; i++) {
                                promises.push(traverseFileTree(entries[i], path + item.name + '/', files));
                            }
                            await Promise.all(promises);
                            readEntries();
                        } else {
                            resolve();
                        }
                    });
                };
                readEntries();
            } else {
                resolve();
            }
        });
    }

    let clickTimeout = null;
    fileDropArea.addEventListener('click', () => {
        if (clickTimeout) {
            return;
        }

        fileDropArea.style.pointerEvents = 'none';

        clickTimeout = setTimeout(() => {
            fileDropArea.style.pointerEvents = 'auto';
            clickTimeout = null;
        }, 1000);
    });

    document.querySelector('label[for="folder-input"]').addEventListener('click', (e) => {
        e.stopPropagation();
    });

    async function handleFileSelection(files, isDir) {
        if (!files || files.length === 0) return;

        selectedFiles = files;
        isFolder = isDir;

        totalSize = files.reduce((total, file) => total + file.size, 0);

        let displayName = "";

        if (isFolder) {

            if (files[0].relativePath) {
                const pathParts = files[0].relativePath.split('/');
                if (pathParts.length > 1) {
                    displayName = `${pathParts[0]}.zip (dossier compressé)`;
                } else {
                    displayName = "folder.zip (dossier compressé)";
                }
            } else if (files[0].webkitRelativePath) {
                const pathParts = files[0].webkitRelativePath.split('/');
                if (pathParts.length > 1) {
                    displayName = `${pathParts[0]}.zip (dossier compressé)`;
                } else {
                    displayName = "folder.zip (dossier compressé)";
                }
            } else {
                displayName = "folder.zip (dossier compressé)";
            }
        } else if (files.length > 1) {

            displayName = `${files.length} fichiers.zip (fichiers compressés)`;
        } else {

            displayName = files[0].name;
        }

        fileCount.textContent = `${files.length} fichier${files.length > 1 ? 's' : ''} sélectionné${files.length > 1 ? 's' : ''}`;
        fileSize.textContent = `Taille totale: ${formatFileSize(totalSize)}`;
        cancel.style.display = "block";
        previewContainer.innerHTML = '';

        if (isFolder || files.length > 1) {

            const compressionInfo = document.createElement('div');
            compressionInfo.className = 'compression-info';
            compressionInfo.innerHTML = `
                <i class="fas fa-compress-alt"></i>
                <span>Sera compressé en ZIP lors de l'envoi</span>
            `;

            previewContainer.appendChild(compressionInfo);

            if (isFolder) {
                const zipPreview = document.createElement('div');
                zipPreview.className = 'file-preview-item zip-preview';
                zipPreview.innerHTML = `<i class="fas fa-file-archive file-preview-icon"></i>`;

                const zipName = document.createElement('div');
                zipName.className = 'file-preview-name';
                zipName.textContent = displayName;
                zipPreview.appendChild(zipName);

                previewContainer.appendChild(zipPreview);
            }
        }

        if (files.length > 1) {
            const maxPreviews = 6;
            const filesToPreview = files.slice(0, maxPreviews);

            filesToPreview.forEach(file => {
                createFilePreview(file);
            });

            if (files.length > maxPreviews) {
                const moreFiles = document.createElement('div');
                moreFiles.className = 'file-preview-item';
                moreFiles.innerHTML = `
                    <div class="file-preview-icon">+${files.length - maxPreviews}</div>
                `;
                previewContainer.appendChild(moreFiles);
            }
        } else if (files.length === 1 && !isFolder) {

            createFilePreview(files[0]);
        }

        fileDropArea.hidden = true;
        fileInfo.hidden = false;
        startSendBtn.disabled = false;
    }

    function createFilePreview(file) {
        const previewItem = document.createElement('div');
        previewItem.className = 'file-preview-item';

        const fileType = file.type.split('/')[0];

        if (fileType === 'image') {

            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.onload = () => URL.revokeObjectURL(img.src);
            previewItem.appendChild(img);
        } else if (fileType === 'video') {

            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.setAttribute('muted', '');
            video.setAttribute('playsinline', '');
            video.onloadedmetadata = () => {
                URL.revokeObjectURL(video.src);
                video.play();

                setTimeout(() => {
                    video.pause();
                }, 2000);
            };
            previewItem.appendChild(video);
        } else {

            let iconClass = 'fa-file';

            if (file.name.endsWith('.pdf')) {
                iconClass = 'fa-file-pdf';
            } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                iconClass = 'fa-file-word';
            } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
                iconClass = 'fa-file-excel';
            } else if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) {
                iconClass = 'fa-file-archive';
            } else if (file.name.endsWith('.txt')) {
                iconClass = 'fa-file-alt';
            }

            previewItem.innerHTML = `<i class="fas ${iconClass} file-preview-icon"></i>`;
        }

        const fileName = document.createElement('div');
        fileName.className = 'file-preview-name';
        fileName.textContent = file.name;
        previewItem.appendChild(fileName);

        previewContainer.appendChild(previewItem);
    }

    startSendBtn.addEventListener('click', () => {
        // Vérifier si on envoie des fichiers ou du texte
        if (currentTransferType === 'file') {
            if (selectedFiles.length === 0) return;
        } else if (currentTransferType === 'text') {
            if (textContent.trim() === '') return;
        } else {
            return;
        }

        socket.emit('generate-code');
        codeContainer.hidden = false;
        transferStatus.hidden = false;
        startSendBtn.hidden = true;

        // Cacher la zone de sélection de fichiers/texte et le sélecteur de type
        const transferTypeSelector = document.querySelector('.transfer-type-selector');
        if (transferTypeSelector) {
            transferTypeSelector.style.display = 'none';
        }

        // Cacher le conteneur de fichiers ou de texte
        if (fileContainer) {
            fileContainer.style.display = 'none';
        }
        if (textContainer) {
            textContainer.style.display = 'none';
        }
    });

    copyCodeBtn.addEventListener('click', () => {
        const code = transferCode.textContent;
        try {

            const textArea = document.createElement('textarea');
            textArea.value = code;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) {
                copyCodeBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyCodeBtn.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            } else {
                throw new Error('Échec de la copie');
            }
        } catch (err) {

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(code)
                    .then(() => {
                        copyCodeBtn.innerHTML = '<i class="fas fa-check"></i>';
                        setTimeout(() => {
                            copyCodeBtn.innerHTML = '<i class="fas fa-copy"></i>';
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Erreur lors de la copie: ', err);
                        alert('Impossible de copier le code');
                    });
            }
        }
    });

    shareLinkBtn.addEventListener('click', () => {
        const code = transferCode.textContent;
        const currentUrl = window.location.origin + window.location.pathname;
        const shareUrl = `${currentUrl}?code=${code}`;

        try {

            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) {
                console.log('Le lien a été copié avec succès');
                shareLinkBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    shareLinkBtn.innerHTML = '<i class="fas fa-link"></i>';
                }, 2000);
            } else {
                throw new Error('Échec de la copie');
            }
        } catch (err) {

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shareUrl)
                    .then(() => {
                        console.log('Le lien a été copié avec succès');
                        shareLinkBtn.innerHTML = '<i class="fas fa-check"></i>';
                        setTimeout(() => {
                            shareLinkBtn.innerHTML = '<i class="fas fa-link"></i>';
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Erreur lors de la copie du lien: ', err);
                        alert('Erreur lors de la copie du lien');
                    });
            } else {
                console.error('API Clipboard non supportée');
                alert('Votre navigateur ne supporte pas la copie automatique');
            }
        }
    });

    // Bouton QR Code
    let qrCodeInstance = null;
    qrCodeBtn.addEventListener('click', () => {
        const code = transferCode.textContent;
        const currentUrl = window.location.origin + window.location.pathname;
        const shareUrl = `${currentUrl}?code=${code}`;

        // Vider le conteneur QR code
        const qrcodeContainer = document.getElementById('qrcode');
        qrcodeContainer.innerHTML = '';

        // Générer le QR code
        qrCodeInstance = new QRCode(qrcodeContainer, {
            text: shareUrl,
            width: 256,
            height: 256,
            colorDark: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#000000',
            colorLight: getComputedStyle(document.documentElement).getPropertyValue('--card-color').trim() || '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });

        // Afficher la modal
        qrModal.style.display = 'flex';
    });

    // Fermer la modal QR code
    closeQrBtn.addEventListener('click', () => {
        qrModal.style.display = 'none';
    });

    // Fermer en cliquant en dehors
    qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) {
            qrModal.style.display = 'none';
        }
    });

    connectBtn.addEventListener('click', () => {
        const code = getCodeValue();

        if (code == '00000000') {
            rickroll()
        }

        if (code.length === 8 && /^\d+$/.test(code)) {
            socket.emit('connect-with-code', code);
            receiveStatus.hidden = false;
            codeDigits.forEach(input => input.disabled = true);
            connectBtn.disabled = true;
        } else if (code.length !== 8) {
            receiveStatus.hidden = false;
            document.querySelector('.receive-status .connection-status').className = 'connection-status error';
            document.querySelector('.receive-status .connection-status').innerHTML =
                `<i class="fas fa-exclamation-circle"></i><span>Le code doit contenir 8 chiffres</span>`;

            setTimeout(() => {
                receiveStatus.hidden = true;
            }, 3000);
        }
    });

    acceptReceiveBtn.addEventListener('click', () => {
        console.log('Demande de réception de fichier avec senderConnection:', senderConnection);
        acceptReceiveBtn.hidden = true;
        cancelReceiveBtn.hidden = true;
        progressContainers[1].hidden = false;

        socket.emit('ready-to-receive', {
            senderId: senderConnection
        });
    });

    cancelReceiveBtn.addEventListener('click', () => {
        socket.emit('cancel-transfer', { senderId: senderConnection });
        resetReceiveUI();
    });

    downloadBtn.addEventListener('click', async () => {
        if (!fileBlob) return;

        const filename = incomingFileName.textContent;
        const fileSize = incomingFileSize.textContent;

        // Vérifier si c'est un fichier ZIP et afficher son contenu
        if (isZipFile(filename)) {
            const userAccepted = await showZipContent(fileBlob, filename);
            if (!userAccepted) {
                console.log('Téléchargement du ZIP annulé par l\'utilisateur');
                return;
            }
        }
        // Vérifier si le fichier est potentiellement dangereux
        else if (isDangerousFile(filename)) {
            const userAccepted = await showFileWarning(filename, fileSize);
            if (!userAccepted) {
                console.log('Téléchargement annulé par l\'utilisateur');
                return;
            }
        }

        const url = URL.createObjectURL(fileBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        resetReceiveUI();
    });

    socket.on('connect', () => {
        console.log('Connecté au serveur WebSocket', socket.id);
        hideConnectionError();
    });

    socket.on('disconnect', (reason) => {
        console.log('Déconnecté du serveur WebSocket, raison:', reason);
        wasDisconnected = true;
        disconnectionTime = Date.now();

        
        saveCurrentTransferState();

        if (reason === 'io server disconnect' || reason === 'transport close') {
            showConnectionError('Connexion au serveur perdue. Tentative de reconnexion automatique...');
        }
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log('Reconnecté au serveur après', attemptNumber, 'tentatives');
        hideConnectionError();

    });

    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Tentative de reconnexion', attemptNumber);
    });

    socket.on('reconnect_error', (error) => {
        console.error('Erreur lors de la reconnexion:', error);
    });

    socket.on('reconnect_failed', () => {
        console.error('Échec de la reconnexion après plusieurs tentatives');
        showConnectionError('Impossible de se reconnecter au serveur après plusieurs tentatives. Veuillez recharger la page.');
    });

    socket.on('code-generated', (code) => {
        transferCode.textContent = code;
        isTransferActive = true;
        showTransferWarning(true);
    });

    socket.on('code-expired', (code) => {
        if (transferCode.textContent === code) {
            connectionStatus.className = 'connection-status error';
            connectionStatus.innerHTML = `
                <i class="fas fa-exclamation-circle"></i>
                <span>Code expiré après 10 minutes.</span>
                <button id="regenerate-code-btn" class="secondary-btn" style="margin-top:0.5em;">Générer un nouveau code</button>
            `;

            // Supprimer le paramètre code de l'URL si présent
            removeCodeFromUrl();

            // Ajouter l'événement pour régénérer le code
            document.getElementById('regenerate-code-btn').addEventListener('click', () => {
                // Masquer le message d'expiration
                connectionStatus.className = 'connection-status waiting';
                connectionStatus.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i><span>Génération d\'un nouveau code...</span>';

                // Demander un nouveau code
                socket.emit('generate-code');
            });
        }
    });

    function showCompressionStatus(isCompressing = true, progress = 0) {
        let statusElement = document.querySelector('.compression-status');

        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.className = 'compression-status';

            if (previewContainer.firstChild) {
                previewContainer.insertBefore(statusElement, previewContainer.firstChild);
            } else {
                previewContainer.appendChild(statusElement);
            }
        }

        if (isCompressing) {
            statusElement.innerHTML = `
                <div class="compression-progress">
                    <i class="fas fa-cog fa-spin"></i>
                    <span>Compression en cours: ${progress}%</span>
                    <div class="mini-progress-bar">
                        <div class="mini-progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
            statusElement.hidden = false;

            if (receiverConnection) {
                socket.emit('compression-progress', {
                    receiverId: receiverConnection,
                    progress: progress
                });
            }
        } else {
            statusElement.innerHTML = `
                <div class="compression-complete">
                    <i class="fas fa-check-circle"></i>
                    <span>Compression terminée</span>
                </div>
            `;

            setTimeout(() => {
                statusElement.hidden = true;
            }, 3000);

            if (receiverConnection) {
                socket.emit('compression-complete', {
                    receiverId: receiverConnection
                });
            }
        }
    }

    
    function generateTransferToken() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    
    function saveTransferState(transferId, token, fileInfo, offset = 0) {
        const transferState = {
            transferId,
            token,
            fileInfo,
            offset,
            timestamp: Date.now()
        };
        localStorage.setItem('sharealuxz_transfer_' + transferId, JSON.stringify(transferState));
        console.log('État du transfert sauvegardé:', transferState);
    }

    
    function getTransferState(transferId) {
        const stateJson = localStorage.getItem('sharealuxz_transfer_' + transferId);
        if (stateJson) {
            try {
                return JSON.parse(stateJson);
            } catch (e) {
                console.error('Erreur lors de la lecture de l\'état du transfert:', e);
                return null;
            }
        }
        return null;
    }

    
    function clearTransferState(transferId) {
        localStorage.removeItem('sharealuxz_transfer_' + transferId);
        console.log('État du transfert supprimé pour:', transferId);
    }

    socket.on('receiver-connected', (data) => {
        console.log('Récepteur connecté avec l\'ID:', data.receiverId);
        receiverConnection = data.receiverId;
        connectionStatus.className = 'connection-status success';
        connectionStatus.innerHTML = '<i class="fas fa-check-circle"></i><span>Récepteur connecté! Transfert prêt.</span>';


        const transferToken = generateTransferToken();

        // Si c'est du texte, on l'envoie directement
        if (currentTransferType === 'text') {
            const encoder = new TextEncoder();
            const textData = encoder.encode(textContent);

            const fileInfo = {
                receiverId: receiverConnection,
                name: 'texte.txt',
                size: textData.byteLength,
                type: 'text/plain',
                transferId: data.transferId,
                token: transferToken,
                isText: true  // Indicateur pour le récepteur
            };

            saveTransferState(data.transferId, transferToken, fileInfo);
            console.log('Envoi du texte:', fileInfo);
            socket.emit('file-transfer-start', fileInfo);

            // Stocker le contenu du texte
            window.preparedFileData = textData.buffer;
            window.preparedFile = null;
            return;
        }

        // Sinon, c'est un fichier (comportement normal)
        if (isFolder || selectedFiles.length > 1) {
            showCompressionStatus(true, 0);
        }

        prepareFilesForTransfer().then(fileData => {
            if (isFolder || selectedFiles.length > 1) {
                showCompressionStatus(false);
            }

            const fileInfo = {
                receiverId: receiverConnection,
                name: fileData.name,
                size: fileData.size,
                type: fileData.type,
                transferId: data.transferId,
                token: transferToken
            };


            saveTransferState(data.transferId, transferToken, fileInfo);

            console.log('Envoi des informations du fichier:', fileInfo);
            socket.emit('file-transfer-start', fileInfo);

            // Stocker les données du fichier (ou la référence pour les gros fichiers)
            if (fileData.file) {
                window.preparedFile = fileData.file;
                window.preparedFileData = null;
            } else {
                window.preparedFileData = fileData.data;
                window.preparedFile = null;
            }
        }).catch(error => {
            console.error("Erreur de préparation:", error);
            connectionStatus.className = 'connection-status error';
            connectionStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i><span>Erreur de préparation du fichier</span>';
        });
    });

    socket.on('connected-to-sender', (data) => {
        senderConnection = data.senderId;
        receiveStatus.hidden = false;
        document.querySelector('.receive-status .connection-status').className = 'connection-status success';
        document.querySelector('.receive-status .connection-status').innerHTML = '<i class="fas fa-check-circle"></i><span>Connexion établie!</span>';
        isTransferActive = true;

        // Cacher le conteneur de saisie du code
        const codeInputContainer = document.querySelector('.code-input-container');
        if (codeInputContainer) {
            codeInputContainer.style.display = 'none';
        }
    });

    let isReceivingText = false; // Variable globale pour suivre si on reçoit du texte

    socket.on('file-transfer-start', (data) => {
        console.log('Informations du fichier reçues:', data);
        console.log('data.isText:', data.isText);
        console.log('Type détecté:', data.type);

        // Si c'est du texte, accepter automatiquement et masquer les boutons
        isReceivingText = data.isText === true;

        // Stocker les informations du fichier
        currentFileName = data.name;
        currentFileType = data.type;
        currentFileSize = data.size;
        senderConnection = data.senderId;

        if (isReceivingText) {
            console.log('Mode texte détecté - acceptation automatique');
            fileInfoReceive.hidden = true;
            acceptReceiveBtn.hidden = true;
            cancelReceiveBtn.hidden = true;

            // Accepter automatiquement le texte
            setTimeout(() => {
                fileBuffer = [];
                receivedSize = 0;

                progressContainers[1].hidden = false;

                socket.emit('ready-to-receive', {
                    senderId: senderConnection,
                    offset: 0,
                    isResuming: false
                });
            }, 100);
        } else {
            console.log('Mode fichier normal');
            fileInfoReceive.hidden = false;
            incomingFileName.textContent = data.name;
            incomingFileSize.textContent = formatFileSize(data.size);
            acceptReceiveBtn.hidden = false;
            cancelReceiveBtn.hidden = false;
        }


        if (data.transferId && data.token) {
            const transferState = {
                transferId: data.transferId,
                token: data.token,
                senderId: data.senderId,
                fileInfo: {
                    name: data.name,
                    size: data.size,
                    type: data.type
                },
                offset: 0,
                timestamp: Date.now()
            };
            localStorage.setItem('sharealuxz_receive_' + data.transferId, JSON.stringify(transferState));
            console.log('État de réception sauvegardé pour une éventuelle reprise');
        }
    });

    async function prepareFilesForTransfer() {

        if (isFolder || selectedFiles.length > 1) {
            console.log("Création d'un fichier ZIP à partir de", selectedFiles.length, "fichiers");

            const keepAliveInterval = setInterval(() => {
                if (socket.connected) {
                    socket.emit('pong', { timestamp: Date.now() });
                    console.log("Keep-alive envoyé pendant la compression");
                }
            }, 5000);

            let zipName = "";
            if (isFolder) {

                if (selectedFiles[0].relativePath) {
                    const pathParts = selectedFiles[0].relativePath.split('/');
                    if (pathParts.length > 1) {
                        zipName = `${pathParts[0]}.zip`;
                    } else {
                        zipName = "folder.zip";
                    }
                } else if (selectedFiles[0].webkitRelativePath) {
                    const pathParts = selectedFiles[0].webkitRelativePath.split('/');
                    if (pathParts.length > 1) {
                        zipName = `${pathParts[0]}.zip`;
                    } else {
                        zipName = "folder.zip";
                    }
                } else {
                    zipName = "folder.zip";
                }
            } else {
                zipName = selectedFiles.length > 1 ? `archive_${selectedFiles.length}_fichiers.zip` : selectedFiles[0].name + '.zip';
            }

            console.log("Nom du ZIP:", zipName);

            const zip = new JSZip();

            try {

                for (const file of selectedFiles) {
                    console.log("Ajout au ZIP:", file.name, "taille:", formatFileSize(file.size));

                    // Pour les gros fichiers, on les lit par morceaux
                    if (file.size > 100 * 1024 * 1024) { // Plus de 100 MB
                        console.log("Gros fichier détecté, lecture par morceaux");
                        const content = await readFileInChunks(file);
                        if (file.relativePath) {
                            zip.file(file.relativePath, content);
                        } else if (file.webkitRelativePath) {
                            zip.file(file.webkitRelativePath, content);
                        } else {
                            zip.file(file.name, content);
                        }
                    } else {
                        const content = await readFileAsArrayBuffer(file);
                        if (file.relativePath) {
                            zip.file(file.relativePath, content);
                        } else if (file.webkitRelativePath) {
                            zip.file(file.webkitRelativePath, content);
                        } else {
                            zip.file(file.name, content);
                        }
                    }
                }

                console.log("Compression du ZIP...");

                const zipContent = await zip.generateAsync({
                    type: 'arraybuffer',
                    compression: 'DEFLATE',
                    compressionOptions: { level: 3 } // Niveau réduit (3 au lieu de 6) pour compression plus rapide
                }, (metadata) => {

                    const progress = Math.round(metadata.percent);

                    if (progress % 5 === 0) {
                        console.log(`Compression: ${progress}%`);
                        showCompressionStatus(true, progress);
                    }
                });

                clearInterval(keepAliveInterval);

                console.log("ZIP créé avec succès, taille:", formatFileSize(zipContent.byteLength));

                return {
                    name: zipName,
                    size: zipContent.byteLength,
                    type: 'application/zip',
                    data: zipContent
                };
            } catch (error) {

                clearInterval(keepAliveInterval);

                console.error("Erreur lors de la création du ZIP:", error);
                alert("Erreur lors de la création du ZIP. Veuillez réessayer avec moins de fichiers ou des fichiers plus petits.");
                throw error;
            }
        } else {

            console.log("Envoi d'un seul fichier:", selectedFiles[0].name);

            // Pour les gros fichiers (plus de 500 MB), on ne charge pas tout en mémoire
            if (selectedFiles[0].size > 500 * 1024 * 1024) {
                console.log("Gros fichier détecté, envoi direct sans chargement complet en mémoire");
                // On retourne le fichier directement sans le charger
                return {
                    name: selectedFiles[0].name,
                    size: selectedFiles[0].size,
                    type: selectedFiles[0].type,
                    file: selectedFiles[0] // Référence au fichier original
                };
            }

            const fileContent = await readFileAsArrayBuffer(selectedFiles[0]);
            return {
                name: selectedFiles[0].name,
                size: selectedFiles[0].size,
                type: selectedFiles[0].type,
                data: fileContent
            };
        }
    }

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e.target.error);
            reader.readAsArrayBuffer(file);
        });
    }

    // Lecture de fichier par morceaux pour économiser la mémoire
    async function readFileInChunks(file) {
        const chunkSize = 50 * 1024 * 1024; // 50 MB par morceau (optimisé pour la vitesse)
        const chunks = [];
        let offset = 0;

        while (offset < file.size) {
            const slice = file.slice(offset, offset + chunkSize);
            const chunk = await readFileAsArrayBuffer(slice);
            chunks.push(chunk);
            offset += chunkSize;

            // Laisser respirer le navigateur (réduit pour plus de vitesse)
            if (offset < file.size) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // Combiner tous les morceaux de manière optimisée
        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const combined = new Uint8Array(totalSize);
        let position = 0;
        for (const chunk of chunks) {
            combined.set(new Uint8Array(chunk), position);
            position += chunk.byteLength;
        }

        return combined.buffer;
    }

    socket.on('ready-to-receive', (data) => {
        console.log('Le récepteur est prêt à recevoir le fichier');

        progressContainers[0].hidden = false;

        // Vérifier si on a un gros fichier qui n'a pas été chargé en mémoire
        let fileContent, fileSize, isLargeFile = false;

        if (window.preparedFileData) {
            fileContent = window.preparedFileData;
            fileSize = fileContent.byteLength;
        } else if (window.preparedFile) {
            // Gros fichier non chargé en mémoire
            isLargeFile = true;
            const file = window.preparedFile;
            fileSize = file.size;
        } else {
            console.error("Aucune donnée de fichier préparée");
            return;
        }

        let offset = data.offset || 0;
        let lastProgress = 0;
        let lastSavedProgress = 0;
        let isTransferring = true;

        
        if (data.isResuming && offset > 0) {
            const progress = Math.min(99, Math.round((offset / fileSize) * 100));
            progressBars[0].style.width = progress + '%';
            progressPercentages[0].textContent = progress + '%';
            progressTransferred[0].textContent = formatFileSize(offset) + ' / ' + formatFileSize(fileSize);
            lastProgress = progress;
            console.log(`Reprise de l'envoi à partir de l'offset ${offset} (${progress}%)`);
        }

        async function sendChunks() {
            
            const transferState = getTransferState(data.transferId);
            if (transferState && transferState.offset > 0) {
                
                offset = transferState.offset;
                console.log(`Reprise du transfert à partir de l'offset ${offset} (${Math.round((offset / fileSize) * 100)}%)`);

                
                const progress = Math.min(99, Math.round((offset / fileSize) * 100));
                progressBars[0].style.width = progress + '%';
                progressPercentages[0].textContent = progress + '%';
                progressTransferred[0].textContent = formatFileSize(offset) + ' / ' + formatFileSize(fileSize);
                lastProgress = progress;
            }

            
            let activeTransfers = 0;
            let nextChunkOffset = offset;
            let transferComplete = false;


            const sendSingleChunk = async (chunkOffset) => {
                if (chunkOffset >= fileSize || !isTransferring || transferComplete) {
                    return;
                }

                const end = Math.min(chunkOffset + CHUNK_SIZE, fileSize);
                let chunk;

                // Si c'est un gros fichier, on lit le morceau à la volée
                if (isLargeFile) {
                    const file = window.preparedFile;
                    const slice = file.slice(chunkOffset, end);
                    chunk = await readFileAsArrayBuffer(slice);
                } else {
                    chunk = fileContent.slice(chunkOffset, end);
                }

                const chunkSize = end - chunkOffset;
                const progress = Math.min(99, Math.round((Math.max(offset, chunkOffset + chunkSize) / fileSize) * 100));

                try {
                    
                    socket.emit('file-chunk', {
                        receiverId: data.receiverId || receiverConnection,
                        chunk: chunk,
                        progress: progress,
                        offset: chunkOffset,
                        transferId: data.transferId,
                        token: data.token
                    });

                    
                    if (chunkOffset + chunkSize > offset) {
                        offset = chunkOffset + chunkSize;
                    }

                    
                    if (progress > lastProgress) {
                        lastProgress = progress;
                        progressBars[0].style.width = progress + '%';
                        progressPercentages[0].textContent = progress + '%';
                        progressTransferred[0].textContent = formatFileSize(offset) + ' / ' + formatFileSize(fileSize);
                    }

                    
                    if (progress % 10 === 0 && progress !== lastSavedProgress) {
                        saveTransferState(data.transferId, transferState ? transferState.token : null, null, offset);
                        lastSavedProgress = progress;
                    }

                    
                    if (offset >= fileSize) {
                        if (!transferComplete) {
                            transferComplete = true;

                            
                            await new Promise(resolve => setTimeout(resolve, 500));

                            progressBars[0].style.width = '100%';
                            progressPercentages[0].textContent = '100%';

                            socket.emit('file-transfer-complete', {
                                receiverId: data.receiverId || receiverConnection,
                                transferId: data.transferId
                            });


                            clearTransferState(data.transferId);

                            console.log('Transfert terminé avec succès');

                            // Afficher un message de succès temporaire
                            connectionStatus.className = 'connection-status success';
                            connectionStatus.innerHTML = '<i class="fas fa-check-circle"></i><span>Transfert réussi ! Réinitialisation...</span>';

                            // Garder la protection active pendant la réinitialisation
                            // Réinitialiser l'interface après 2 secondes
                            setTimeout(() => {
                                // Réinitialiser tous les éléments
                                selectedFiles = [];
                                textContent = '';
                                currentTransferType = 'file';
                                receiverConnection = null;

                                // Désactiver la protection maintenant
                                isTransferActive = false;
                                showTransferWarning(false);

                                // Masquer les conteneurs de transfert
                                codeContainer.hidden = true;
                                transferStatus.hidden = true;
                                progressContainers[0].hidden = true;

                                // Réafficher les éléments initiaux
                                fileDropArea.style.display = 'flex';
                                fileInfo.hidden = true;
                                startSendBtn.hidden = false;
                                startSendBtn.disabled = true;
                                cancel.style.display = 'none';

                                // Réafficher le sélecteur de type et les conteneurs
                                const transferTypeSelector = document.querySelector('.transfer-type-selector');
                                if (transferTypeSelector) {
                                    transferTypeSelector.style.display = 'flex';
                                }
                                if (fileContainer) {
                                    fileContainer.style.display = 'block';
                                }
                                if (textContainer) {
                                    textContainer.style.display = 'block';
                                }

                                // Réinitialiser le conteneur de texte
                                if (textInput) {
                                    textInput.value = '';
                                    textCharCount.textContent = '0 caractères';
                                }

                                // Réinitialiser les barres de progression
                                progressBars[0].style.width = '0%';
                                progressPercentages[0].textContent = '0%';

                                // Nettoyer le preview
                                previewContainer.innerHTML = '';
                                fileCount.textContent = '0 fichiers sélectionnés';
                                fileSize.textContent = 'Taille totale: 0 KB';

                                // Réinitialiser les fichiers préparés
                                window.preparedFileData = null;
                                window.preparedFile = null;

                                // Remettre le bon conteneur visible
                                fileContainer.hidden = false;
                                textContainer.hidden = true;

                                // Réinitialiser le code de transfert
                                transferCode.textContent = '--------';

                                console.log('Interface réinitialisée');
                            }, 2000);
                        }
                        return;
                    }

                    
                    const nextOffset = nextChunkOffset;
                    nextChunkOffset += CHUNK_SIZE;
                    activeTransfers--;

                    if (nextOffset < fileSize && isTransferring && !transferComplete) {
                        activeTransfers++;
                        sendSingleChunk(nextOffset);
                    }
                } catch (error) {
                    console.error(`Erreur lors de l'envoi du chunk à l'offset ${chunkOffset}:`, error);
                    activeTransfers--;

                    
                    if (isTransferring && !transferComplete) {
                        setTimeout(() => {
                            if (isTransferring && !transferComplete) {
                                activeTransfers++;
                                sendSingleChunk(chunkOffset);
                            }
                        }, 500);
                    }
                }
            };

            
            console.log(`Démarrage du transfert parallèle avec ${MAX_PARALLEL_CHUNKS} chunks simultanés`);
            for (let i = 0; i < MAX_PARALLEL_CHUNKS && nextChunkOffset < fileSize; i++) {
                const chunkOffset = nextChunkOffset;
                nextChunkOffset += CHUNK_SIZE;
                activeTransfers++;
                sendSingleChunk(chunkOffset);
            }

            
            const monitorInterval = setInterval(() => {
                if (transferComplete || !isTransferring || activeTransfers === 0) {
                    clearInterval(monitorInterval);

                    
                    
                    if (!transferComplete && isTransferring && nextChunkOffset < fileSize) {
                        console.log("Redémarrage des transferts parallèles...");
                        for (let i = 0; i < MAX_PARALLEL_CHUNKS && nextChunkOffset < fileSize; i++) {
                            const chunkOffset = nextChunkOffset;
                            nextChunkOffset += CHUNK_SIZE;
                            activeTransfers++;
                            sendSingleChunk(chunkOffset);
                        }
                    }
                }
            }, 1000);
        }

        sendChunks().catch(error => {
            console.error('Erreur globale lors de l\'envoi:', error);
        });
    });

    socket.on('file-chunk', (data) => {
        
        if (!window.chunkMap) {
            window.chunkMap = new Map();
        }

        
        window.chunkMap.set(data.offset, data.chunk);

        
        receivedSize += data.chunk.byteLength;

        
        let totalSizeText = incomingFileSize.textContent;
        let totalSizeBytes = parseFileSize(totalSizeText);

        
        let progress = 0;
        if (totalSizeBytes > 0) {
            progress = Math.min(99, Math.round((receivedSize / totalSizeBytes) * 100));
        } else if (data.progress) {
            progress = data.progress;
        }

        
        if (progress % 2 === 0) {
            progressBars[1].style.width = progress + '%';
            progressPercentages[1].textContent = progress + '%';
            progressTransferred[1].textContent = formatFileSize(receivedSize) + ' / ' + totalSizeText;

            
            if (progress % 5 === 0) {
                updateRemainingTime(receivedSize, totalSizeBytes);
            }
        }

        
        if (data.transferId && progress % 10 === 0) {
            const stateJson = localStorage.getItem('sharealuxz_receive_' + data.transferId);
            if (stateJson) {
                try {
                    const state = JSON.parse(stateJson);
                    state.offset = receivedSize;
                    localStorage.setItem('sharealuxz_receive_' + data.transferId, JSON.stringify(state));
                } catch (e) {
                    console.error('Erreur lors de la mise à jour de l\'état de réception:', e);
                }
            }
        }
    });

    socket.on('file-transfer-complete', (data) => {
        progressBars[1].style.width = '100%';
        progressPercentages[1].textContent = '100%';


        if (window.chunkMap && window.chunkMap.size > 0) {
            console.log('Assemblage de', window.chunkMap.size, 'chunks reçus');


            const sortedOffsets = Array.from(window.chunkMap.keys()).sort((a, b) => a - b);


            let totalSize = 0;
            for (const offset of sortedOffsets) {
                totalSize += window.chunkMap.get(offset).byteLength;
            }


            const buffer = new Uint8Array(totalSize);
            let position = 0;


            for (const offset of sortedOffsets) {
                const chunk = new Uint8Array(window.chunkMap.get(offset));
                buffer.set(chunk, position);
                position += chunk.byteLength;
            }


            fileBlob = new Blob([buffer]);


            window.chunkMap.clear();
            window.chunkMap = null;
        } else {

            const chunks = new Uint8Array(receivedSize);
            let position = 0;

            for (const chunk of fileBuffer) {
                const chunkArray = new Uint8Array(chunk);
                chunks.set(chunkArray, position);
                position += chunk.byteLength;
            }

            fileBlob = new Blob([chunks]);
            fileBuffer = [];
        }

        // Vérifier si c'est du texte
        if (isReceivingText) {
            console.log('Affichage du texte reçu');
            // Afficher le texte reçu
            const reader = new FileReader();
            reader.onload = function(e) {
                const text = e.target.result;
                receivedTextPreview.textContent = text;
                receivedTextCharCount.textContent = `${text.length} caractères`;

                // Afficher la zone de texte
                textReceiveArea.hidden = false;
                fileInfoReceive.hidden = true;
                downloadBtn.hidden = true;

                console.log('Texte affiché avec succès');
            };
            reader.readAsText(fileBlob);
        } else {
            console.log('Affichage du bouton télécharger pour fichier');
            downloadBtn.hidden = false;
        }

        cancelReceiveBtn.hidden = true;

        document.querySelector('.receive-status .connection-status').innerHTML =
            '<i class="fas fa-check-circle"></i><span>Transfert terminé avec succès!</span>';


        if (data.transferId) {
            localStorage.removeItem('sharealuxz_receive_' + data.transferId);
        }


        resetDownloadTimeDisplay();

        // Désactiver la protection de fermeture de page
        isTransferActive = false;
        showTransferWarning(false);
    });

    socket.on('connection-error', (message) => {
        document.querySelector('.receive-status .connection-status').className = 'connection-status error';
        document.querySelector('.receive-status .connection-status').innerHTML =
            `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;

        // Supprimer le paramètre code de l'URL si présent
        removeCodeFromUrl();

        setTimeout(resetReceiveUI, 3000);
    });

    socket.on('cancel-transfer', () => {
        if (document.querySelector('.tab-btn.active').getAttribute('data-tab') === 'send') {
            // Afficher le message de refus pour l'expéditeur
            connectionStatus.className = 'connection-status error';
            connectionStatus.innerHTML = '<i class="fas fa-times-circle"></i><span>Transfert refusé par le récepteur</span>';

            // Attendre un peu avant de réinitialiser pour que l'utilisateur voie le message
            setTimeout(() => {
                resetSendUI();
            }, 3000);
        } else {
            resetReceiveUI();

            resetDownloadTimeDisplay();
        }
    });

    
    function showConnectionError(message = 'Connexion au serveur perdue. Tentative de reconnexion...') {
        let errorBanner = document.getElementById('connection-error-banner');

        if (!errorBanner) {
            errorBanner = document.createElement('div');
            errorBanner.id = 'connection-error-banner';
            errorBanner.className = 'connection-error-banner';
            document.body.insertBefore(errorBanner, document.body.firstChild);
        }

        errorBanner.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button id="retry-connection-btn"><i class="fas fa-sync-alt"></i> Reconnecter</button>
            <button id="reload-page-btn"><i class="fas fa-redo"></i> Recharger</button>
        `;

        errorBanner.style.display = 'flex';

        
        document.getElementById('reload-page-btn').addEventListener('click', () => {
            window.location.reload();
        });

        
        document.getElementById('retry-connection-btn').addEventListener('click', () => {
            
            if (socket.disconnected) {
                socket.connect();

                
                const retryBtn = document.getElementById('retry-connection-btn');
                if (retryBtn) {
                    retryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Tentative...';
                    retryBtn.disabled = true;

                    
                    setTimeout(() => {
                        if (retryBtn) {
                            retryBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Reconnecter';
                            retryBtn.disabled = false;
                        }
                    }, 3000);
                }
            }
        });
    }

    function hideConnectionError() {
        const errorBanner = document.getElementById('connection-error-banner');
        if (errorBanner) {
            errorBanner.style.display = 'none';
        }
    }

    socket.on('ping', (data) => {

        socket.emit('pong', { timestamp: data.timestamp });
    });

    socket.on('transfer-error', (message) => {
        console.error('Erreur de transfert:', message);

        if (document.querySelector('.tab-btn.active').getAttribute('data-tab') === 'send') {
            
            

            connectionStatus.className = 'connection-status error';
            connectionStatus.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;

            
            const retryButton = document.createElement('button');
            retryButton.className = 'primary-btn';
            retryButton.innerHTML = '<i class="fas fa-sync"></i> Réessayer';
            retryButton.style.marginTop = '10px';
            retryButton.addEventListener('click', () => {
                
                connectionStatus.className = 'connection-status waiting';
                connectionStatus.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i><span>Tentative de reconnexion...</span>';

                
                socket.emit('check-receiver', { receiverId: receiverConnection }, (isConnected) => {
                    if (isConnected) {
                        
                        connectionStatus.className = 'connection-status success';
                        connectionStatus.innerHTML = '<i class="fas fa-check-circle"></i><span>Récepteur reconnecté! Transfert en cours...</span>';
                    } else {
                        
                        resetSendUI();
                        startSendBtn.click();
                    }
                });
            });

            connectionStatus.appendChild(retryButton);
        } else {
            document.querySelector('.receive-status .connection-status').className = 'connection-status error';
            document.querySelector('.receive-status .connection-status').innerHTML =
                `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
        }

        
        
    });

    function retryWithExponentialBackoff(fn, maxRetries = 5, baseDelay = 1000) {
        let retryCount = 0;

        const attempt = () => {
            return new Promise((resolve, reject) => {
                fn().then(resolve).catch(err => {
                    retryCount++;
                    if (retryCount <= maxRetries) {
                        const delay = baseDelay * Math.pow(2, retryCount - 1);
                        console.log(`Échec de l'opération, nouvelle tentative dans ${delay}ms (tentative ${retryCount}/${maxRetries})`);
                        setTimeout(() => {
                            attempt().then(resolve).catch(reject);
                        }, delay);
                    } else {
                        reject(err);
                    }
                });
            });
        };

        return attempt();
    }

    socket.on('compression-progress', (data) => {
        console.log('Progression de la compression reçue:', data.progress + '%');

        const compressionInfo = document.querySelector('.compression-status-receiver');

        if (!compressionInfo) {

            const newCompressionInfo = document.createElement('div');
            newCompressionInfo.className = 'compression-status-receiver';
            newCompressionInfo.innerHTML = `
                <div class="compression-progress">
                    <i class="fas fa-cog fa-spin"></i>
                    <span>L'expéditeur compresse les fichiers: ${data.progress}%</span>
                    <div class="mini-progress-bar">
                        <div class="mini-progress-fill" style="width: ${data.progress}%"></div>
                    </div>
                </div>
            `;
            document.querySelector('.receive-status').appendChild(newCompressionInfo);
        } else {

            const progressBar = compressionInfo.querySelector('.mini-progress-fill');
            const progressText = compressionInfo.querySelector('span');
            if (progressBar) progressBar.style.width = data.progress + '%';
            if (progressText) progressText.textContent = `L'expéditeur compresse les fichiers: ${data.progress}%`;
        }
    });

    socket.on('compression-complete', () => {
        console.log('Compression terminée par l\'expéditeur');

        const compressionInfo = document.querySelector('.compression-status-receiver');
        if (compressionInfo) {
            compressionInfo.innerHTML = `
                <div class="compression-complete">
                    <i class="fas fa-check-circle"></i>
                    <span>Compression terminée, transfert en préparation...</span>
                </div>
            `;

            setTimeout(() => {
                compressionInfo.remove();
            }, 3000);
        }
    });
    
    function updateRemainingTime(receivedSize, totalSize) {
        const now = Date.now();

        
        if (downloadStartTime === 0) {
            downloadStartTime = now;
            downloadLastUpdate = now;
            downloadSpeeds = [];

            
            if (!downloadTimeElement) {
                downloadTimeElement = document.createElement('div');
                downloadTimeElement.className = 'download-time';
                const progressInfo = document.querySelectorAll('.progress-info')[1]; 
                if (progressInfo) {
                    progressInfo.appendChild(downloadTimeElement);
                }
            }
            return;
        }

        
        const timeDiff = (now - downloadLastUpdate) / 1000; 
        if (timeDiff > 1.0) { 
            const bytesReceived = receivedSize;
            const speed = bytesReceived / ((now - downloadStartTime) / 1000);

            
            downloadSpeeds.push(speed);
            if (downloadSpeeds.length > 3) {
                downloadSpeeds.shift();
            }

            
            const avgSpeed = downloadSpeeds.reduce((sum, s) => sum + s, 0) / downloadSpeeds.length;

            
            const bytesRemaining = totalSize - receivedSize;
            const secondsRemaining = bytesRemaining / avgSpeed;

            
            let timeString = '';
            if (secondsRemaining < 60) {
                timeString = `${Math.round(secondsRemaining)}s`;
            } else if (secondsRemaining < 3600) {
                timeString = `${Math.round(secondsRemaining / 60)}min`;
            } else {
                const hours = Math.floor(secondsRemaining / 3600);
                const minutes = Math.round((secondsRemaining % 3600) / 60);
                timeString = `${hours}h ${minutes}min`;
            }

            
            if (downloadTimeElement) {
                downloadTimeElement.innerHTML = `
                    <span class="download-speed">${formatFileSize(avgSpeed)}/s</span>
                    <span class="download-remaining">Reste: ${timeString}</span>
                `;
            }

            downloadLastUpdate = now;
        }
    }

    
    function parseFileSize(sizeStr) {
        const units = {
            'Bytes': 1,
            'KB': 1024,
            'MB': 1024 * 1024,
            'GB': 1024 * 1024 * 1024,
            'TB': 1024 * 1024 * 1024 * 1024
        };

        const regex = /^([\d.]+)\s*([A-Z]+)$/;
        const match = sizeStr.match(regex);

        if (!match) return 0;

        const size = parseFloat(match[1]);
        const unit = match[2];

        return size * (units[unit] || 0);
    }

    
    function resetDownloadTimeDisplay() {
        downloadStartTime = 0;
        downloadLastUpdate = 0;
        downloadSpeeds = [];
        if (downloadTimeElement) {
            downloadTimeElement.remove();
            downloadTimeElement = null;
        }
    }

    
    function saveCurrentTransferState() {
        
        if (receivedSize > 0 && senderConnection && fileInfoReceive && !fileInfoReceive.hidden) {
            const transferId = new Date().getTime().toString();
            const transferState = {
                transferId: transferId,
                senderId: senderConnection,
                fileInfo: {
                    name: incomingFileName.textContent,
                    size: parseFileSize(incomingFileSize.textContent),
                    type: 'application/octet-stream'
                },
                offset: receivedSize,
                timestamp: Date.now(),
                autoReconnect: true
            };

            localStorage.setItem('sharealuxz_receive_' + transferId, JSON.stringify(transferState));
            console.log('État de téléchargement sauvegardé pour reprise après déconnexion');
        }
    }

    
    function updateStatsBar(stats) {
        if (stats.activeUsers !== undefined) {
            const statUsersElements = document.querySelectorAll('[id^="stat-users"]');
            statUsersElements.forEach(element => {
                element.textContent = stats.activeUsers;
            });
        }
        if (stats.totalFiles !== undefined) {
            const statFilesElements = document.querySelectorAll('[id^="stat-files"]');
            statFilesElements.forEach(element => {
                element.textContent = stats.totalFiles;
            });
        }
        if (stats.totalGB !== undefined) {
            const statGBElements = document.querySelectorAll('[id^="stat-gb"]');
            statGBElements.forEach(element => {
                element.textContent = parseFloat(stats.totalGB).toFixed(2);
            });
        }
    }

    
    socket.on('stats-update', updateStatsBar);


    fetch('/stats')
        .then(r => r.json())
        .then(updateStatsBar)
        .catch(() => { });

    // Vérifier si l'administration est activée
    fetch('/api/admin/enabled')
        .then(r => r.json())
        .then(data => {
            if (data.enabled) {
                const adminLinkContainer = document.getElementById('admin-link-container');
                if (adminLinkContainer) {
                    adminLinkContainer.style.display = 'inline';
                }
            }
        })
        .catch(() => { });

    if (mode === "dark") {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }

    window.ChangeMode = function () {
        if (mode === "light") {
            mode = "dark";
            localStorage.setItem('mode', 'dark');
            document.body.classList.add('dark');
        } else {
            mode = "light";
            localStorage.setItem('mode', 'light');
            document.body.classList.remove('dark');
        }
    }

    
    const privacyLink = document.getElementById('privacy-link');
    const privacyModal = document.getElementById('privacy-modal');
    const closePrivacy = document.getElementById('close-privacy');
    if (privacyLink && privacyModal && closePrivacy) {
        privacyLink.addEventListener('click', function (e) {
            e.preventDefault();
            privacyModal.style.display = 'flex';
        });
        closePrivacy.addEventListener('click', function () {
            privacyModal.style.display = 'none';
        });
        privacyModal.addEventListener('click', function (e) {
            if (e.target === privacyModal) privacyModal.style.display = 'none';
        });
    }

    
    if (document.getElementById('cancel-file')) {
        document.getElementById('cancel-file').addEventListener('click', () => {
            resetSendUI();
        });
    }

    socket.on('resume-approved', (data) => {
        console.log('Reprise du transfert approuvée:', data);

        
        const statusElement = document.querySelector('.receive-status .connection-status');
        if (statusElement) {
            statusElement.className = 'connection-status success';
            statusElement.innerHTML = '<i class="fas fa-check-circle"></i><span>Reprise du téléchargement acceptée!</span>';
        }

        
        if (data.offset && progressTransferred && progressTransferred[1]) {
            if (incomingFileSize) {
                const totalSizeBytes = parseFileSize(incomingFileSize.textContent);
                if (totalSizeBytes > 0) {
                    const progress = Math.min(99, Math.round((data.offset / totalSizeBytes) * 100));
                    if (progressBars && progressBars[1]) progressBars[1].style.width = progress + '%';
                    if (progressPercentages && progressPercentages[1]) progressPercentages[1].textContent = progress + '%';
                    progressTransferred[1].textContent = formatFileSize(data.offset) + ' / ' + incomingFileSize.textContent;
                }
            }
        }
    });

    socket.on('resume-error', (message) => {
        console.error('Erreur de reprise de transfert:', message);

        
        const statusElement = document.querySelector('.receive-status .connection-status');
        if (statusElement) {
            statusElement.className = 'connection-status error';
            statusElement.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>Erreur de reprise: ${message}</span>`;
        }

        
        const keys = Object.keys(localStorage);
        const receiveKeys = keys.filter(key => key.startsWith('sharealuxz_receive_'));
        receiveKeys.forEach(key => {
            console.log(`Suppression de l'état de transfert invalide: ${key}`);
            localStorage.removeItem(key);
        });

        
        setTimeout(() => {
            resetReceiveUI();
        }, 5000);
    });
});

function rickroll() {
    tktcr.style.display = "block"
    
    const video = tktcr.querySelector('video');
    if (video) {
        video.currentTime = 0;
        video.play().catch(() => { }); 
    }
}