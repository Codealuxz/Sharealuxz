// ========================================
// TOUR GUIDE INTERACTIF - SHAREALUXZ
// Guide pas à pas avec overlay et spotlight
// ======================================== */

class TourGuide {
    constructor(steps) {
        this.steps = steps;
        this.currentStep = 0;
        this.isActive = false;

        this.overlay = null;
        this.spotlight = null;
        this.tooltip = null;
        this.welcomeModal = null;

        this.init();
    }

    init() {
        // Créer les éléments du DOM
        this.createOverlay();
        this.createSpotlight();
        this.createTooltip();
        this.createWelcomeModal();

        // Vérifier si l'utilisateur a déjà vu le tutoriel
        const hasSeenTour = localStorage.getItem('firstTuto');
        if (!hasSeenTour) {
            // Afficher le badge "Nouveau" sur le bouton
            this.showNewBadge();
        }
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';
        document.body.appendChild(this.overlay);
    }

    createSpotlight() {
        this.spotlight = document.createElement('div');
        this.spotlight.className = 'tour-spotlight';
        document.body.appendChild(this.spotlight);
    }

    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tour-tooltip';
        this.tooltip.innerHTML = `
            <div class="tour-tooltip-header">
                <div class="tour-step-indicator"></div>
                <h3 class="tour-tooltip-title"></h3>
                <button class="tour-close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="tour-tooltip-content">
                <p class="tour-tooltip-description"></p>
                <div class="tour-tooltip-tip"></div>
            </div>
            <div class="tour-tooltip-footer">
                <div class="tour-progress"></div>
                <div class="tour-nav-buttons">
                    <button class="tour-btn tour-btn-skip">
                        Passer
                    </button>
                    <button class="tour-btn tour-btn-secondary tour-btn-prev">
                        <i class="fas fa-arrow-left"></i> Précédent
                    </button>
                    <button class="tour-btn tour-btn-primary tour-btn-next">
                        Suivant <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(this.tooltip);

        // Event listeners
        this.tooltip.querySelector('.tour-close-btn').addEventListener('click', () => this.end());
        this.tooltip.querySelector('.tour-btn-skip').addEventListener('click', () => this.end());
        this.tooltip.querySelector('.tour-btn-prev').addEventListener('click', () => this.prev());
        this.tooltip.querySelector('.tour-btn-next').addEventListener('click', () => this.next());
    }

    createWelcomeModal() {
        this.welcomeModal = document.createElement('div');
        this.welcomeModal.className = 'tour-welcome-modal';
        this.welcomeModal.innerHTML = `
            <div class="tour-welcome-header">
                <h2>Bienvenue sur Sharealuxz !</h2>
            </div>
            <div class="tour-welcome-content">
                <p>Laissez-nous vous guider à travers les fonctionnalités principales de Sharealuxz pour un démarrage rapide.</p>
                <ul class="tour-features-list">
                    <li>
                        <i class="fas fa-paper-plane"></i>
                        <span>Comment envoyer des fichiers</span>
                    </li>
                    <li>
                        <i class="fas fa-download"></i>
                        <span>Comment recevoir des fichiers</span>
                    </li>
                    <li>
                        <i class="fas fa-bolt"></i>
                        <span>Découvrir Quick Send</span>
                    </li>
                    <li>
                        <i class="fas fa-lightbulb"></i>
                        <span>Astuces et fonctionnalités cachées</span>
                    </li>
                </ul>
                <p><small>⏱️ Durée estimée : 2-3 minutes</small></p>
            </div>
            <div class="tour-welcome-footer">
                <button class="tour-welcome-skip">
                    Plus tard
                </button>
                <button class="tour-welcome-start">
                    <i class="fas fa-play"></i> Démarrer le tutoriel
                </button>
            </div>
        `;
        document.body.appendChild(this.welcomeModal);

        // Event listeners
        this.welcomeModal.querySelector('.tour-welcome-skip').addEventListener('click', () => {
            this.hideWelcomeModal();
            localStorage.setItem('firstTuto', 'skipped');
        });

        this.welcomeModal.querySelector('.tour-welcome-start').addEventListener('click', () => {
            this.hideWelcomeModal();
            this.start();
        });
    }

    showNewBadge() {
        const fabButton = document.querySelector('.tour-start-fab');
        if (fabButton && !fabButton.querySelector('.tour-new-badge')) {
            const badge = document.createElement('span');
            badge.className = 'tour-new-badge';
            badge.textContent = 'NEW';
            fabButton.appendChild(badge);
        }
    }

    showWelcomeModal() {
        this.overlay.classList.add('active');
        this.welcomeModal.classList.add('active');
        document.body.classList.add('tour-active');
    }

    hideWelcomeModal() {
        this.overlay.classList.remove('active');
        this.welcomeModal.classList.remove('active');
        document.body.classList.remove('tour-active');
    }

    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.overlay.classList.add('active');
        document.body.classList.add('tour-active');
        this.showStep(this.currentStep);

        // Marquer comme vu
        localStorage.setItem('firstTuto', 'completed');

        // Retirer le badge "Nouveau"
        const badge = document.querySelector('.tour-new-badge');
        if (badge) badge.remove();
    }

    showStep(index) {
        if (index < 0 || index >= this.steps.length) return;

        const step = this.steps[index];
        const element = document.querySelector(step.element);

        if (!element) {
            console.warn(`Element not found: ${step.element}`);
            return;
        }

        // Mettre à jour le contenu du tooltip
        const indicator = this.tooltip.querySelector('.tour-step-indicator');
        const title = this.tooltip.querySelector('.tour-tooltip-title');
        const description = this.tooltip.querySelector('.tour-tooltip-description');
        const tip = this.tooltip.querySelector('.tour-tooltip-tip');

        indicator.textContent = `Étape ${index + 1} sur ${this.steps.length}`;
        title.textContent = step.title;
        description.textContent = step.description;

        if (step.tip) {
            tip.innerHTML = `<i class="fas fa-lightbulb"></i> ${step.tip}`;
            tip.style.display = 'block';
        } else {
            tip.style.display = 'none';
        }

        // Mettre à jour les boutons
        const prevBtn = this.tooltip.querySelector('.tour-btn-prev');
        const nextBtn = this.tooltip.querySelector('.tour-btn-next');

        prevBtn.style.display = index === 0 ? 'none' : 'inline-flex';

        if (index === this.steps.length - 1) {
            nextBtn.innerHTML = '<i class="fas fa-check"></i> Terminer';
        } else {
            nextBtn.innerHTML = 'Suivant <i class="fas fa-arrow-right"></i>';
        }

        // Mettre à jour la barre de progression
        this.updateProgress();

        // Positionner le spotlight
        this.positionSpotlight(element);

        // Positionner et afficher le tooltip
        this.positionTooltip(element, step.position || 'bottom');

        // Faire défiler l'élément dans la vue
        this.scrollToElement(element);

        // Effet de highlight sur l'élément
        element.classList.add('tour-element-highlighted');

        // Callback personnalisé si défini
        if (step.onShow) {
            step.onShow();
        }
    }

    positionSpotlight(element) {
        const rect = element.getBoundingClientRect();
        const padding = 8;

        this.spotlight.style.display = 'block';
        this.spotlight.style.top = (rect.top + window.scrollY - padding) + 'px';
        this.spotlight.style.left = (rect.left + window.scrollX - padding) + 'px';
        this.spotlight.style.width = (rect.width + padding * 2) + 'px';
        this.spotlight.style.height = (rect.height + padding * 2) + 'px';
    }

    positionTooltip(element, position) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const offset = 20;

        let top, left;

        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - offset;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                this.tooltip.className = 'tour-tooltip position-top active';
                break;

            case 'bottom':
                top = rect.bottom + offset;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                this.tooltip.className = 'tour-tooltip position-bottom active';
                break;

            case 'left':
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.left - tooltipRect.width - offset;
                this.tooltip.className = 'tour-tooltip position-left active';
                break;

            case 'right':
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.right + offset;
                this.tooltip.className = 'tour-tooltip position-right active';
                break;

            default:
                top = rect.bottom + offset;
                left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                this.tooltip.className = 'tour-tooltip position-bottom active';
        }

        // S'assurer que le tooltip reste dans la fenêtre
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) {
            top = rect.bottom + offset; // Forcer en dessous si pas de place en haut
        }

        this.tooltip.style.top = top + 'px';
        this.tooltip.style.left = left + 'px';
    }

    scrollToElement(element) {
        const rect = element.getBoundingClientRect();
        const offset = 100;

        if (rect.top < offset || rect.bottom > window.innerHeight - offset) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    updateProgress() {
        const progressContainer = this.tooltip.querySelector('.tour-progress');
        progressContainer.innerHTML = '';

        for (let i = 0; i < this.steps.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'tour-progress-dot';
            if (i === this.currentStep) {
                dot.classList.add('active');
            }
            progressContainer.appendChild(dot);
        }
    }

    cleanupElement(element) {
        if (!element) return;

        // Retirer le highlight
        element.classList.remove('tour-element-highlighted');
    }

    next() {
        // Retirer le highlight de l'élément actuel
        const currentElement = document.querySelector(this.steps[this.currentStep].element);
        this.cleanupElement(currentElement);

        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showStep(this.currentStep);
        } else {
            this.end();
        }
    }

    prev() {
        // Retirer le highlight de l'élément actuel
        const currentElement = document.querySelector(this.steps[this.currentStep].element);
        this.cleanupElement(currentElement);

        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }

    end() {
        this.isActive = false;

        // Retirer le highlight et nettoyer
        const currentElement = document.querySelector(this.steps[this.currentStep].element);
        this.cleanupElement(currentElement);

        // Retirer l'overlay, le tooltip et le spotlight
        this.overlay.classList.remove('active');
        this.tooltip.classList.remove('active');
        this.spotlight.style.display = 'none';
        document.body.classList.remove('tour-active');

        // Callback de fin si défini
        if (this.onComplete) {
            this.onComplete();
        }
    }

    restart() {
        this.currentStep = 0;
        this.start();
    }
}

// Définir les étapes du tutoriel
const tourSteps = [
    {
        element: '.tabs-main',
        title: 'Navigation principale',
        description: 'Utilisez ces onglets pour basculer entre "Recevoir" et "Envoyer". Chaque mode a ses propres fonctionnalités.',
        tip: 'La section "Recevoir" est affichée par défaut.',
        position: 'bottom'
    },
    {
        element: '.tab-btn[data-tab="send"]',
        title: 'Mode Envoyer',
        description: 'Cliquez ici pour accéder au mode envoi. Vous pourrez sélectionner des fichiers ou du texte à partager.',
        tip: 'Vous pouvez aussi glisser-déposer vos fichiers directement sur la page !',
        position: 'bottom',
        onShow: () => {
            // Activer l'onglet Envoyer automatiquement
            const sendTab = document.querySelector('.tab-btn[data-tab="send"]');
            if (sendTab && !sendTab.classList.contains('active')) {
                sendTab.click();
            }
        }
    },
    {
        element: '.transfer-type-selector',
        title: 'Type de contenu',
        description: 'Choisissez si vous voulez envoyer des fichiers/dossiers ou du texte brut.',
        tip: 'Pour plusieurs fichiers, ils seront automatiquement compressés en ZIP.',
        position: 'right'
    },
    {
        element: '.file-drop-area',
        title: 'Zone de dépôt',
        description: 'Glissez vos fichiers ici ou cliquez sur les boutons pour sélectionner des fichiers ou un dossier complet.',
        tip: 'Astuce : Vous pouvez glisser vos fichiers n\'importe où sur la page !',
        position: 'right'
    },
    {
        element: '#start-send-btn',
        title: 'Bouton Envoyer',
        description: 'Une fois vos fichiers sélectionnés, cliquez ici pour générer un code de transfert à 8 chiffres. ⚠️ IMPORTANT : Gardez cette fenêtre ouverte jusqu\'à la fin du transfert ! Le transfert est direct (peer-to-peer) entre votre navigateur et celui du destinataire, sans passer par un serveur intermédiaire.',
        tip: 'Le code sera valide pendant 10 minutes. Si vous fermez la fenêtre, le transfert sera interrompu.',
        position: 'top'
    },
    {
        element: '.tab-btn[data-tab="receive"]',
        title: 'Mode Recevoir',
        description: 'Passons maintenant au mode réception pour voir comment recevoir un fichier.',
        position: 'bottom',
        onShow: () => {
            // Activer l'onglet Recevoir automatiquement
            const receiveTab = document.querySelector('.tab-btn[data-tab="receive"]');
            if (receiveTab && !receiveTab.classList.contains('active')) {
                receiveTab.click();
            }
        }
    },
    {
        element: '.code-digits-wrapper',
        title: 'Saisie du code',
        description: 'Entrez ici le code à 8 chiffres reçu de l\'expéditeur. Vous pouvez aussi le coller directement (Ctrl+V).',
        tip: 'Si vous recevez un lien de partage, le code sera pré-rempli automatiquement !',
        position: 'bottom'
    },
    {
        element: '#connect-btn',
        title: 'Se connecter',
        description: 'Cliquez ici (ou appuyez sur Entrée) pour vous connecter à l\'expéditeur et voir les informations du fichier.',
        position: 'bottom'
    },
    {
        element: '.quicksendbtnhead',
        title: 'Quick Send - Partage instantané',
        description: 'Quick Send permet d\'envoyer des fichiers instantanément à d\'autres utilisateurs en ligne, sans code ! Cliquez sur ce bouton pour ouvrir le panneau Quick Send.',
        tip: 'C\'est le moyen le plus rapide de partager des fichiers entre utilisateurs connectés.',
        position: 'bottom',
        onShow: () => {
            // Ouvrir Quick Send automatiquement
            const quickSendBtn = document.querySelector('.quicksendbtnhead');
            if (quickSendBtn && !document.querySelector('#quicksend').classList.contains('show')) {
                quickSendBtn.click();
            }
        }
    },
    {
        element: '#quicksend-user-list',
        title: 'Liste des utilisateurs en ligne',
        description: 'Ici s\'affichent tous les utilisateurs actuellement connectés sur Sharealuxz. Vous pouvez leur envoyer des fichiers instantanément en cliquant sur leur nom.',
        tip: 'Chaque utilisateur a un identifiant unique généré aléatoirement.',
        position: 'bottom'
    },
    {
        element: '#quicksend',
        title: 'Comment utiliser Quick Send',
        description: '1. Sélectionnez un utilisateur dans la liste\n2. Choisissez votre fichier (maximum 100 Mo)\n3. Le destinataire reçoit une notification et peut accepter ou refuser\n4. Le transfert démarre automatiquement après acceptation\n\n⚠️ IMPORTANT : Gardez cette fenêtre ouverte pendant tout le transfert !',
        tip: 'Le transfert Quick Send est aussi en peer-to-peer. Si vous fermez la fenêtre, le transfert s\'arrête.',
        position: 'left'
    },
    {
        element: '.dark-light-btn',
        title: 'Mode sombre/clair',
        description: 'Changez le thème de l\'interface selon vos préférences. Votre choix sera sauvegardé.',
        tip: 'Essayez les deux modes pour voir lequel vous préférez !',
        position: 'bottom'
    },
    {
        element: '.stats-bar',
        title: 'Statistiques en temps réel',
        description: 'Ces statistiques montrent le nombre d\'utilisateurs connectés, de fichiers envoyés et le volume total transféré. Vous avez terminé le tutoriel ! Vous savez maintenant comment utiliser Sharealuxz pour envoyer et recevoir des fichiers en toute simplicité.',
        tip: 'Les stats se mettent à jour automatiquement toutes les 5 minutes. N\'oubliez pas : gardez toujours votre fenêtre ouverte pendant les transferts !',
        position: 'top',
        onShow: () => {
            // Fermer Quick Send si ouvert
            const quickSendPanel = document.querySelector('#quicksend');
            if (quickSendPanel && quickSendPanel.classList.contains('show')) {
                const quickSendBtn = document.querySelector('.quicksendbtnhead');
                if (quickSendBtn) {
                    quickSendBtn.click();
                }
            }
        }
    }
];

// Initialiser le tour guidé
let tour;

document.addEventListener('DOMContentLoaded', () => {
    // Créer le tour
    tour = new TourGuide(tourSteps);

    // Créer le bouton FAB pour démarrer le tutoriel
    const fabButton = document.createElement('button');
    fabButton.className = 'tour-start-fab';
    fabButton.innerHTML = `
        <i class="fas fa-question"></i>
        <span class="tour-fab-tooltip">Lancer le tutoriel</span>
    `;
    document.body.appendChild(fabButton);

    fabButton.addEventListener('click', () => {
        const hasSeenTour = localStorage.getItem('firstTuto');
        if (!hasSeenTour) {
            tour.showWelcomeModal();
        } else {
            tour.start();
        }
    });

    // Afficher la modal de bienvenue automatiquement pour les nouveaux utilisateurs
    const hasSeenTour = localStorage.getItem('firstTuto');
    const hasAcceptedTerms = localStorage.getItem('terms_accepted');

    // Afficher le tutoriel seulement après avoir accepté les conditions
    if (!hasSeenTour && hasAcceptedTerms) {
        setTimeout(() => {
            tour.showWelcomeModal();
        }, 2000); // 2 secondes après le chargement de la page
    }
});

// Fonction globale pour redémarrer le tour (peut être appelée depuis la console)
window.restartTour = () => {
    if (tour) {
        tour.restart();
    }
};

// Fonction pour réinitialiser le tour (marquer comme non vu)
window.resetTour = () => {
    localStorage.removeItem('firstTuto');
    location.reload();
};
