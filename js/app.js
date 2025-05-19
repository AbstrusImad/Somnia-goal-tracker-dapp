/**
 * app.js
 * Archivo principal que inicializa la aplicación Goal Tracker
 */

// Función de inicialización principal
function initApp() {
    console.log("Inicializando Goal Tracker App...");
    
    // Estado global de la aplicación
    window.AppState = {
        isInitialized: false,
        walletConnected: false,
        contract: null,
        userAccount: null
    };
    
    // Inicializar módulo de wallet
    WalletManager.init();
    
    // Escuchar evento de conexión de wallet
    document.addEventListener('walletConnected', function(event) {
        const { userAccount, contract } = event.detail;
        
        console.log("Wallet conectada:", userAccount);
        
        // Actualizar estado global
        window.AppState.walletConnected = true;
        window.AppState.contract = contract;
        window.AppState.userAccount = userAccount;
        
        // Inicializar módulos una vez que la wallet está conectada
        initializeModules(contract, userAccount);
    });
    
    // Escuchar evento de desconexión de wallet
    document.addEventListener('walletDisconnected', function() {
        console.log("Wallet desconectada");
        window.AppState.walletConnected = false;
        window.AppState.contract = null;
        window.AppState.userAccount = null;
    });
    
    // Verificar si ethers.js está cargado correctamente
    if (typeof ethers === 'undefined') {
        console.error("Ethers no está definido. Intentando cargar de nuevo...");
        
        // Intentar cargar ethers.js dinámicamente como último recurso
        var script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js";
        script.onload = function() {
            console.log("Ethers cargado exitosamente:", ethers.version);
            WalletManager.init();
        };
        document.head.appendChild(script);
    }
}

// Función para inicializar todos los módulos
function initializeModules(contract, userAccount) {
    console.log("Inicializando módulos con contrato y cuenta...");
    
    try {
        // Inicializar GoalManager
        if (window.GoalManager && typeof window.GoalManager.init === 'function') {
            window.GoalManager.init(contract, userAccount);
        } else {
            console.error("GoalManager no está disponible o no tiene método init");
        }
        
        // Inicializar SharingManager
        if (window.SharingManager && typeof window.SharingManager.init === 'function') {
            window.SharingManager.init(contract, userAccount);
        } else {
            console.error("SharingManager no está disponible o no tiene método init");
        }
        
        // Mostrar la pestaña de Mis Objetivos por defecto
        setTimeout(() => {
            if (window.SharingManager && typeof window.SharingManager.showMyGoalsTab === 'function') {
                window.SharingManager.showMyGoalsTab();
            }
        }, 500);
        
        // Marcar como inicializado
        window.AppState.isInitialized = true;
        console.log("Aplicación inicializada completamente");
        
    } catch (error) {
        console.error("Error al inicializar módulos:", error);
        alert("Error al inicializar la aplicación. Por favor, recarga la página.");
    }
}

// Función global de ayuda (para depuración)
window.reinitializeApp = function() {
    console.log("Reinicializando la aplicación...");
    
    if (window.AppState && window.AppState.contract && window.AppState.userAccount) {
        initializeModules(window.AppState.contract, window.AppState.userAccount);
        return "Aplicación reinicializada correctamente";
    } else {
        return "No se puede reinicializar: wallet no conectada";
    }
};

// Iniciar la aplicación cuando se cargue la página
window.addEventListener('load', initApp);

// Verificar errores de carga
window.addEventListener('error', function(event) {
    console.error("Error capturado por window.onerror:", event.message);
    
    // Si es un error de script, intentar cargar de nuevo
    if (event.filename && event.filename.includes('.js')) {
        console.log("Error en archivo JS:", event.filename);
        
        // Solo reintentar cargar scripts críticos
        if (event.filename.includes('wallet.js') || 
            event.filename.includes('goals.js') || 
            event.filename.includes('sharing.js')) {
            
            console.log("Intentando recargar script:", event.filename);
            
            setTimeout(() => {
                const script = document.createElement('script');
                script.src = event.filename + '?t=' + new Date().getTime(); // Evitar caché
                document.head.appendChild(script);
            }, 2000);
        }
    }
});