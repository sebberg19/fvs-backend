// Bouton flottant pour demander un maillot introuvable
(function() {
    'use strict';

    // Injecter le bouton dans le DOM
    function injectButton() {
        const buttonHtml = `
            <button id="request-jersey-btn" class="btn-request-jersey" title="Vous ne trouvez pas un maillot ?">
                <i class="bi bi-envelope-plus-fill me-2"></i>
                <span class="btn-text">Maillot introuvable ?</span>
            </button>
        `;
        document.body.insertAdjacentHTML('beforeend', buttonHtml);
    }

    // Injecter la modale
    function injectModal() {
        const modalHtml = `
            <div id="request-jersey-modal" class="request-modal" style="display: none;">
                <div class="request-modal-overlay"></div>
                <div class="request-modal-content">
                    <button class="request-modal-close" aria-label="Fermer">
                        <i class="bi bi-x-lg"></i>
                    </button>
                    
                    <div class="request-modal-header">
                        <h3>Maillot introuvable ?</h3>
                    </div>
                    
                    <div class="request-modal-body">
                        <p class="intro-text">
                            Vous recherchez un maillot qui n'est pas disponible sur notre site ?
                        </p>
                        
                        <div class="request-steps">
                            <div class="request-step">
                                <div class="step-number">1</div>
                                <div class="step-content">
                                    Prenez une photo du maillot recherché
                                </div>
                            </div>
                            
                            <div class="request-step">
                                <div class="step-number">2</div>
                                <div class="step-content">
                                    Envoyez-nous un email avec la photo en pièce jointe
                                </div>
                            </div>
                            
                            <div class="request-step">
                                <div class="step-number">3</div>
                                <div class="step-content">
                                    Nous vérifions la disponibilité et vous répondons sous <strong>1-2 jours</strong>
                                </div>
                            </div>
                        </div>
                        
                        <div class="email-address">
                            <i class="bi bi-envelope-fill me-2"></i>
                            <a href="mailto:futbolerovintageshop@gmail.com">
                                futbolerovintageshop@gmail.com
                            </a>
                        </div>
                    </div>
                    
                    <div class="request-modal-footer">
                        <button class="btn-send-email">
                            <i class="bi bi-envelope-fill me-2"></i>
                            Envoyer un email
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Injecter les styles
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Bouton flottant */
            .btn-request-jersey {
                position: fixed;
                bottom: 30px;
                right: 30px;
                z-index: 1000;
                background: #000;
                color: white;
                border: 2px solid #000;
                border-radius: 50px;
                padding: 14px 24px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
            }
            
            .btn-request-jersey:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
                background: #1a1a1a;
            }
            
            .btn-request-jersey:active {
                transform: translateY(0);
            }
            
            .btn-request-jersey i {
                font-size: 18px;
            }
            
            /* Modale */
            .request-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .request-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
                animation: fadeIn 0.3s ease;
            }
            
            .request-modal-content {
                position: relative;
                background: white;
                border-radius: 12px;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.3s ease;
                border: 2px solid #000;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .request-modal-close {
                position: absolute;
                top: 16px;
                right: 16px;
                background: transparent;
                border: none;
                font-size: 20px;
                color: #666;
                cursor: pointer;
                padding: 4px;
                line-height: 1;
                transition: color 0.2s ease;
                z-index: 1;
            }
            
            .request-modal-close:hover {
                color: #000;
            }
            
            .request-modal-header {
                text-align: center;
                padding: 40px 32px 24px;
                border-bottom: 2px solid #f0f0f0;
            }
            
            .request-modal-header h3 {
                margin: 0;
                font-size: 24px;
                font-weight: 700;
                color: #000;
            }
            
            .request-modal-body {
                padding: 32px;
            }
            
            .intro-text {
                color: #333;
                line-height: 1.6;
                font-size: 15px;
                margin: 0 0 28px 0;
                text-align: center;
            }
            
            .request-steps {
                margin-bottom: 28px;
            }
            
            .request-step {
                display: flex;
                gap: 16px;
                margin-bottom: 18px;
                align-items: center;
            }
            
            .request-step:last-child {
                margin-bottom: 0;
            }
            
            .step-number {
                flex-shrink: 0;
                width: 32px;
                height: 32px;
                background: #000;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 15px;
            }
            
            .step-content {
                flex: 1;
                color: #333;
                line-height: 1.5;
                font-size: 14px;
            }
            
            .email-address {
                background: #f8f8f8;
                border: 2px solid #000;
                padding: 18px;
                border-radius: 8px;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .email-address i {
                font-size: 16px;
                color: #000;
            }
            
            .email-address a {
                color: #000;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
                word-break: break-all;
            }
            
            .email-address a:hover {
                text-decoration: underline;
            }
            
            .request-modal-footer {
                padding: 24px 32px 32px;
                text-align: center;
            }
            
            .btn-send-email {
                background: #000;
                color: white;
                border: 2px solid #000;
                border-radius: 8px;
                padding: 14px 32px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            
            .btn-send-email:hover {
                background: #1a1a1a;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .btn-send-email:active {
                transform: translateY(0);
            }
            
            .btn-send-email i {
                font-size: 18px;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .btn-request-jersey {
                    bottom: 20px;
                    right: 20px;
                    padding: 12px 16px;
                    font-size: 11px;
                    border-radius: 8px;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .btn-request-jersey .btn-text {
                    display: block;
                    font-size: 11px;
                    font-weight: 700;
                    text-align: center;
                    line-height: 1.2;
                }
                
                .btn-request-jersey i {
                    display: none;
                }
                
                .request-modal-content {
                    max-width: 100%;
                    margin: 0 16px;
                }
                
                .request-modal-header {
                    padding: 24px 20px 20px;
                }
                
                .request-modal-header h3 {
                    font-size: 20px;
                }
                
                .request-modal-body {
                    padding: 24px 20px;
                }
                
                .request-modal-footer {
                    padding: 20px 20px 24px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Ouvrir la modale
    function openModal() {
        const modal = document.getElementById('request-jersey-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    // Fermer la modale
    function closeModal() {
        const modal = document.getElementById('request-jersey-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    // Envoyer l'email
    function sendEmail() {
        const email = 'futbolerovintageshop@gmail.com';
        const subject = encodeURIComponent('Demande de maillot - Futbolero');
        const body = encodeURIComponent(
            'Bonjour,\n\n' +
            'Je recherche un maillot qui n\'est pas disponible sur votre site.\n\n' +
            'Détails du maillot recherché :\n' +
            '- Équipe/Club : \n' +
            '- Saison/Année : \n' +
            '- Taille souhaitée : \n\n' +
            'J\'ai joint une photo du maillot en pièce jointe.\n\n' +
            'Merci de me faire savoir si vous pouvez vous le procurer.\n\n' +
            'Cordialement'
        );
        
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        closeModal();
    }

    // Initialisation
    document.addEventListener('DOMContentLoaded', function() {
        injectStyles();
        injectButton();
        injectModal();
        
        // Bouton flottant
        const requestBtn = document.getElementById('request-jersey-btn');
        if (requestBtn) {
            requestBtn.addEventListener('click', openModal);
        }

        // Bouton fermer
        const closeBtn = document.querySelector('.request-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        // Overlay (clic pour fermer)
        const overlay = document.querySelector('.request-modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', closeModal);
        }

        // Bouton envoyer email
        const sendBtn = document.querySelector('.btn-send-email');
        if (sendBtn) {
            sendBtn.addEventListener('click', sendEmail);
        }

        // Fermer avec Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
    });
})();
