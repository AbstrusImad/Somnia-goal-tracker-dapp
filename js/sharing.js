/**
 * sharing.js
 * Maneja la funcionalidad relacionada con compartir objetivos y gestionar permisos
 */

const SharingManager = (() => {
    // Variables locales
    let contract;
    let userAccount;
    let goalToShare = -1;
    let goalToManage = -1;
    
    // DOM elements
    let shareModal, shareAddress, shareName, shareRole, shareCancel, shareConfirm;
    let accessModal, usersList, accessDone, addUserBtn, sharedGoalsList, sharedGoalsCount;
    let tabMyGoals, tabSharedGoals, contentMyGoals, contentSharedGoals;
    
    // Inicialización
    function init(contractInstance, account) {
        console.log("Inicializando SharingManager...");
        contract = contractInstance;
        userAccount = account;
        
        // Obtener referencias a los elementos DOM
        shareModal = document.getElementById('share-modal');
        shareAddress = document.getElementById('share-address');
        shareName = document.getElementById('share-name');
        shareRole = document.getElementById('share-role');
        shareCancel = document.getElementById('share-cancel');
        shareConfirm = document.getElementById('share-confirm');
        accessModal = document.getElementById('access-modal');
        usersList = document.getElementById('users-list');
        accessDone = document.getElementById('access-done');
        addUserBtn = document.getElementById('add-user-button');
        sharedGoalsList = document.getElementById('shared-goals-list');
        sharedGoalsCount = document.getElementById('shared-goals-count');
        
        // Tab elements
        tabMyGoals = document.getElementById('tab-my-goals');
        tabSharedGoals = document.getElementById('tab-shared-goals');
        contentMyGoals = document.getElementById('content-my-goals');
        contentSharedGoals = document.getElementById('content-shared-goals');
        
        console.log("Configurando eventos para compartir objetivos...");
        
        // Configurar eventos usando métodos directos
        if (shareCancel) shareCancel.onclick = hideShareModal;
        if (shareConfirm) shareConfirm.onclick = confirmShareGoal;
        if (accessDone) accessDone.onclick = hideAccessModal;
        if (addUserBtn) addUserBtn.onclick = () => showShareModal(goalToManage);
        
        // Tab navigation
        if (tabMyGoals) tabMyGoals.onclick = showMyGoalsTab;
        if (tabSharedGoals) tabSharedGoals.onclick = showSharedGoalsTab;
        
        console.log("SharingManager inicializado correctamente");
    }
    
    // Mostrar la pestaña de mis objetivos
    function showMyGoalsTab() {
        console.log("Mostrando pestaña Mis Objetivos");
        
        // Activar pestaña
        if (tabMyGoals) tabMyGoals.classList.add('active');
        if (tabSharedGoals) tabSharedGoals.classList.remove('active');
        
        // Mostrar contenido
        if (contentMyGoals) contentMyGoals.classList.add('active');
        if (contentSharedGoals) contentSharedGoals.classList.remove('active');
        
        // Cargar objetivos
        if (window.GoalManager) {
            window.GoalManager.loadMyGoals();
        } else {
            console.error("GoalManager no está disponible");
        }
    }
    
    // Mostrar la pestaña de objetivos compartidos
    function showSharedGoalsTab() {
        console.log("Mostrando pestaña Objetivos Compartidos");
        
        // Activar pestaña
        if (tabSharedGoals) tabSharedGoals.classList.add('active');
        if (tabMyGoals) tabMyGoals.classList.remove('active');
        
        // Mostrar contenido
        if (contentSharedGoals) contentSharedGoals.classList.add('active');
        if (contentMyGoals) contentMyGoals.classList.remove('active');
        
        // Cargar objetivos compartidos
        loadSharedGoals();
    }
    
    // Mostrar modal para compartir
    function showShareModal(goalIndex) {
        console.log("Mostrando modal de compartir para el objetivo:", goalIndex);
        goalToShare = goalIndex;
        
        // Resetear campos
        if (shareAddress) shareAddress.value = '';
        if (shareName) shareName.value = '';
        if (shareRole) shareRole.value = '1'; // Default: Viewer
        
        // Mostrar modal
        if (shareModal) {
            shareModal.classList.add('active');
            console.log("Modal de compartir activado");
        } else {
            console.error("Error: shareModal no encontrado");
        }
    }
    
    // Ocultar modal para compartir
    function hideShareModal() {
        console.log("Ocultando modal de compartir");
        if (shareModal) shareModal.classList.remove('active');
        goalToShare = -1;
    }
    
    // Confirmar compartir objetivo
    async function confirmShareGoal() {
        console.log("Confirmando compartir objetivo:", goalToShare);
        if (goalToShare < 0) {
            console.error("No hay objetivo seleccionado para compartir");
            return;
        }
        
        try {
            const address = shareAddress.value.trim();
            const name = shareName.value.trim();
            const role = parseInt(shareRole.value);
            
            console.log("Datos para compartir:", { address, name, role, goalIndex: goalToShare });
            
            if (!ethers.utils.isAddress(address)) {
                alert("Por favor ingresa una dirección de wallet válida");
                return;
            }
            
            // Deshabilitar botón mientras se procesa
            if (shareConfirm) {
                shareConfirm.innerHTML = "<span class='loader'></span> Compartiendo...";
                shareConfirm.disabled = true;
            }
            
            // Verificar el contrato
            if (!contract) {
                throw new Error("Contrato no inicializado");
            }
            
            // Información de depuración
            console.log("Llamando función grantAccess con parámetros:", {
                goalIndex: goalToShare,
                address,
                role,
                name
            });
            
            // Llamar al contrato
            try {
                const tx = await contract.grantAccess(goalToShare, address, role, name);
                console.log("Transacción enviada:", tx.hash);
                await tx.wait();
                console.log("Transacción confirmada!");
                
                // Mostrar mensaje de éxito
                alert(`Objetivo compartido exitosamente con ${address}`);
            } catch (contractError) {
                console.error("Error al llamar al contrato:", contractError);
                
                // Intentar con una versión alternativa si hay error
                if (contractError.message.includes("parameters") || 
                    contractError.message.includes("arguments")) {
                    console.log("Intentando versión alternativa...");
                    
                    try {
                        // Algunas implementaciones podrían tener orden diferente
                        const tx = await contract.grantAccess(goalToShare, address, name, role);
                        console.log("Transacción alternativa enviada:", tx.hash);
                        await tx.wait();
                        console.log("Transacción alternativa confirmada!");
                        
                        // Mostrar mensaje de éxito
                        alert(`Objetivo compartido exitosamente con ${address}`);
                    } catch (altError) {
                        console.error("Error en versión alternativa:", altError);
                        throw altError;
                    }
                } else {
                    throw contractError;
                }
            }
            
            // Si estamos en el modal de gestión de acceso, actualizar la lista
            if (goalToManage >= 0) {
                loadGoalUsers(goalToManage);
            }
            
            hideShareModal();
            
        } catch (error) {
            console.error("Error al compartir objetivo:", error);
            alert(`Error: ${error.message}`);
        } finally {
            if (shareConfirm) {
                shareConfirm.innerHTML = "Compartir Objetivo";
                shareConfirm.disabled = false;
            }
        }
    }
    
    // Mostrar modal de gestión de acceso
    function showAccessModal(goalIndex) {
        console.log("Mostrando modal de gestión de acceso para el objetivo:", goalIndex);
        goalToManage = goalIndex;
        
        // Cargar usuarios con acceso a este objetivo
        loadGoalUsers(goalIndex);
        
        // Mostrar modal
        if (accessModal) {
            accessModal.classList.add('active');
        } else {
            console.error("Error: accessModal no encontrado");
        }
    }
    
    // Ocultar modal de gestión de acceso
    function hideAccessModal() {
        console.log("Ocultando modal de gestión de acceso");
        if (accessModal) accessModal.classList.remove('active');
        goalToManage = -1;
    }
    
    // Cargar usuarios con acceso a un objetivo
    async function loadGoalUsers(goalIndex) {
        console.log("Cargando usuarios con acceso al objetivo:", goalIndex);
        try {
            if (!contract) {
                throw new Error("Contrato no inicializado");
            }
            
            if (!usersList) {
                console.error("Error: usersList no encontrado");
                return;
            }
            
            const users = await contract.getGoalUsers(goalIndex);
            console.log("Usuarios obtenidos:", users);
            
            // Limpiar lista
            usersList.innerHTML = '';
            
            if (users.length === 0) {
                usersList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-text">Este objetivo no se ha compartido con nadie aún.</div>
                    </div>
                `;
                return;
            }
            
            // Añadir cada usuario a la lista
            users.forEach(user => {
                const userElement = document.createElement('div');
                userElement.className = 'user-item';
                
                let roleName;
                switch (parseInt(user.role)) {
                    case 1: roleName = 'Visor'; break;
                    case 2: roleName = 'Editor'; break;
                    default: roleName = 'Desconocido';
                }
                
                userElement.innerHTML = `
                    <div class="user-info">
                        <div class="user-address">${user.userAddress.substring(0, 6)}...${user.userAddress.substring(38)}</div>
                        <div class="user-name">${user.userName || 'Sin nombre'} - <span class="status-badge badge-role">${roleName}</span></div>
                    </div>
                    <div class="user-actions">
                        <button id="revoke-button-${user.userAddress.substring(2, 10)}" class="sf-button sf-button-danger">Revocar Acceso</button>
                    </div>
                `;
                
                usersList.appendChild(userElement);
                
                // Configurar evento para el botón de revocar
                const revokeBtn = document.getElementById(`revoke-button-${user.userAddress.substring(2, 10)}`);
                if (revokeBtn) {
                    revokeBtn.onclick = () => revokeAccess(user.userAddress);
                }
            });
            
        } catch (error) {
            console.error("Error al cargar usuarios:", error);
            if (usersList) {
                usersList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-text">Error al cargar usuarios: ${error.message}</div>
                    </div>
                `;
            }
        }
    }
    
    // Revocar acceso a un usuario
    async function revokeAccess(userAddress) {
        console.log(`Revocando acceso para ${userAddress} al objetivo ${goalToManage}`);
        if (goalToManage < 0) {
            console.error("No hay objetivo seleccionado para gestionar");
            return;
        }
        
        try {
            if (!contract) {
                throw new Error("Contrato no inicializado");
            }
            
            // Mostrar mensaje de confirmación
            if (!confirm(`¿Estás seguro de que deseas revocar el acceso a ${userAddress.substring(0, 6)}...${userAddress.substring(38)}?`)) {
                return;
            }
            
            // Llamar al contrato
            const tx = await contract.revokeAccess(goalToManage, userAddress);
            console.log("Transacción enviada:", tx.hash);
            await tx.wait();
            console.log("Acceso revocado exitosamente");
            
            // Actualizar lista de usuarios
            loadGoalUsers(goalToManage);
            
            // Mostrar mensaje de éxito
            alert("Acceso revocado exitosamente");
            
        } catch (error) {
            console.error("Error al revocar acceso:", error);
            alert(`Error: ${error.message}`);
        }
    }
    
    // Cargar objetivos compartidos conmigo
    async function loadSharedGoals() {
        console.log("Cargando objetivos compartidos conmigo");
        try {
            if (!contract) {
                throw new Error("Contrato no inicializado");
            }
            
            if (!sharedGoalsList || !sharedGoalsCount) {
                console.error("Error: Elementos DOM para objetivos compartidos no encontrados");
                return;
            }
            
            const [owners, goalIndices] = await contract.getSharedWithMeGoals();
            console.log("Objetivos compartidos recibidos:", { owners, goalIndices });
            
            // Actualizar contador
            sharedGoalsCount.textContent = owners.length;
            
            // Limpiar lista
            sharedGoalsList.innerHTML = '';
            
            if (owners.length === 0) {
                sharedGoalsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔄</div>
                        <div class="empty-state-text">No tienes objetivos compartidos contigo aún.</div>
                    </div>
                `;
                return;
            }
            
            // Procesar cada objetivo compartido
            for (let i = 0; i < owners.length; i++) {
                const owner = owners[i];
                const index = typeof goalIndices[i].toNumber === 'function' ? 
                              goalIndices[i].toNumber() : Number(goalIndices[i]);
                
                console.log(`Procesando objetivo compartido ${i}: owner=${owner}, index=${index}`);
                
                // Obtener información detallada del objetivo
                try {
                    const [goals, indices] = await contract.getUserGoals(owner);
                    
                    // Encontrar el objetivo correcto
                    for (let j = 0; j < indices.length; j++) {
                        const goalIndex = typeof indices[j].toNumber === 'function' ? 
                                         indices[j].toNumber() : Number(indices[j]);
                        
                        if (goalIndex === index) {
                            console.log(`Objetivo encontrado en posición ${j}:`, goals[j]);
                            // Renderizar el objetivo
                            renderSharedGoalItem(goals[j], owner, index);
                            break;
                        }
                    }
                } catch (error) {
                    console.error(`Error al cargar objetivo compartido (${owner}, ${index}):`, error);
                    // Mostrar mensaje de error para este objetivo específico
                    const errorElement = document.createElement('div');
                    errorElement.className = 'goal-item error';
                    errorElement.innerHTML = `
                        <div class="goal-title">
                            <span>Error al cargar objetivo</span>
                        </div>
                        <div class="goal-owner">
                            <span>Compartido por: ${owner.substring(0, 6)}...${owner.substring(38)}</span>
                        </div>
                        <div class="goal-actions">
                            <button onclick="SharingManager.retryLoadSharedGoal('${owner}', ${index})" class="sf-button">Reintentar</button>
                        </div>
                    `;
                    sharedGoalsList.appendChild(errorElement);
                }
            }
            
        } catch (error) {
            console.error("Error al cargar objetivos compartidos:", error);
            if (sharedGoalsList) {
                sharedGoalsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-text">Error al cargar objetivos compartidos: ${error.message}</div>
                    </div>
                `;
            }
        }
    }
    
    // Renderizar un objetivo compartido
    function renderSharedGoalItem(goal, owner, index) {
        console.log(`Renderizando objetivo compartido: owner=${owner}, index=${index}`);
        const goalElement = document.createElement('div');
        
        // Convertir valores a tipos primitivos si son BigNumber
        const deadline = typeof goal.deadline === 'object' && goal.deadline.toNumber ? 
                         goal.deadline.toNumber() : Number(goal.deadline);
        const completed = goal.completed === true;
        
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const isExpired = !completed && currentTimestamp > deadline;
        
        if (completed) {
            goalElement.className = 'goal-item completed fade-in';
        } else if (isExpired) {
            goalElement.className = 'goal-item expired fade-in';
        } else {
            goalElement.className = 'goal-item pending fade-in';
        }
        
        let statusBadge = '';
        if (completed) {
            statusBadge = '<span class="status-badge badge-completed">Completado</span>';
        } else if (isExpired) {
            statusBadge = '<span class="status-badge badge-expired">Expirado</span>';
        } else {
            statusBadge = '<span class="status-badge badge-pending">En Progreso</span>';
        }
        
        let deadlineDate;
        try {
            deadlineDate = new Date(deadline * 1000).toLocaleDateString();
        } catch (error) {
            console.error("Error al formatear fecha:", error);
            deadlineDate = "Fecha inválida";
        }
        
        // Construir elemento HTML
        goalElement.innerHTML = `
            <div class="goal-owner">
                <span class="goal-owner-icon">👤</span>
                <span>Compartido por: ${owner.substring(0, 6)}...${owner.substring(38)}</span>
            </div>
            <div class="goal-title">
                <span>${goal.text}</span>
                ${statusBadge}
            </div>
            <div class="goal-deadline">Fecha límite: ${deadlineDate}</div>
            <div class="goal-role">
                <span class="status-badge badge-role">Cargando rol...</span>
            </div>
            <div class="goal-actions">
                <span class="loader"></span> Cargando acciones...
            </div>
        `;
        
        sharedGoalsList.appendChild(goalElement);
        
        // Verificar rol y actualizar acciones
        checkRoleAndRender(goalElement, owner, index, completed, isExpired, goal);
    }
    
    // Verificar rol y actualizar acciones
    async function checkRoleAndRender(goalElement, owner, index, completed, isExpired, goal) {
        try {
            if (!contract) {
                throw new Error("Contrato no inicializado");
            }
            
            const role = await contract.getUserRole(owner, index, userAccount);
            console.log(`Rol obtenido para objetivo compartido: ${role}`);
            
            const roleValue = typeof role === 'object' && role.toNumber ? role.toNumber() : Number(role);
            
            // Construir acciones según el rol
            let actions = '';
            
            if (roleValue >= 2 && !completed && !isExpired) { // Editor o superior
                actions += `
                    <button id="complete-shared-${owner.substring(2, 10)}-${index}" 
                        class="sf-button">Marcar Completado</button>
                    
                    <button id="edit-shared-${owner.substring(2, 10)}-${index}" 
                        class="sf-button">Editar</button>
                `;
            }
            
            if (roleValue >= 3) { // Admin
                actions += `
                    <button id="delete-shared-${owner.substring(2, 10)}-${index}" 
                        class="sf-button sf-button-danger">Eliminar</button>
                `;
            }
            
            // Añadir acciones al elemento
            const actionsContainer = goalElement.querySelector('.goal-actions');
            if (actionsContainer) {
                actionsContainer.innerHTML = actions;
                
                // Configurar eventos para los botones
                if (roleValue >= 2 && !completed && !isExpired) {
                    const completeBtn = document.getElementById(`complete-shared-${owner.substring(2, 10)}-${index}`);
                    if (completeBtn) {
                        completeBtn.onclick = () => window.GoalManager.completeGoal(owner, index);
                    }
                    
                    const editBtn = document.getElementById(`edit-shared-${owner.substring(2, 10)}-${index}`);
                    if (editBtn) {
                        editBtn.onclick = () => window.GoalManager.showEditModal(
                            owner, 
                            index, 
                            goal.text, 
                            typeof goal.deadline === 'object' && goal.deadline.toNumber ? 
                            goal.deadline.toNumber() : Number(goal.deadline)
                        );
                    }
                }
                
                if (roleValue >= 3) {
                    const deleteBtn = document.getElementById(`delete-shared-${owner.substring(2, 10)}-${index}`);
                    if (deleteBtn) {
                        deleteBtn.onclick = () => window.GoalManager.showDeleteModal(owner, index);
                    }
                }
            }
            
            // Determinar nombre del rol
            let roleName;
            switch (roleValue) {
                case 1: roleName = 'Visor'; break;
                case 2: roleName = 'Editor'; break;
                case 3: roleName = 'Admin'; break;
                default: roleName = 'Desconocido';
            }
            
            // Actualizar badge de rol
            const roleElement = goalElement.querySelector('.goal-role');
            if (roleElement) {
                roleElement.innerHTML = `<span class="status-badge badge-role">Tu rol: ${roleName}</span>`;
            }
            
        } catch (error) {
            console.error(`Error al verificar rol para (${owner}, ${index}):`, error);
            
            // Mostrar mensaje de error en las acciones
            const actionsContainer = goalElement.querySelector('.goal-actions');
            if (actionsContainer) {
                actionsContainer.innerHTML = `
                    <div class="status-error">Error al cargar permisos: ${error.message}</div>
                `;
            }
            
            // Actualizar badge de rol con error
            const roleElement = goalElement.querySelector('.goal-role');
            if (roleElement) {
                roleElement.innerHTML = `<span class="status-badge badge-role">Error al cargar rol</span>`;
            }
        }
    }
    
    // Reintentar cargar un objetivo compartido
    async function retryLoadSharedGoal(owner, index) {
        console.log(`Reintentando cargar objetivo compartido: owner=${owner}, index=${index}`);
        try {
            const [goals, indices] = await contract.getUserGoals(owner);
            
            // Encontrar el objetivo correcto
            for (let j = 0; j < indices.length; j++) {
                const goalIndex = typeof indices[j].toNumber === 'function' ? 
                                 indices[j].toNumber() : Number(indices[j]);
                
                if (goalIndex === index) {
                    // Renderizar el objetivo
                    renderSharedGoalItem(goals[j], owner, index);
                    
                    // Eliminar el elemento de error
                    const errorElements = Array.from(sharedGoalsList.querySelectorAll('.goal-item.error'));
                    for (const elem of errorElements) {
                        if (elem.textContent.includes(owner.substring(0, 6))) {
                            elem.remove();
                            break;
                        }
                    }
                    
                    break;
                }
            }
        } catch (error) {
            console.error(`Error al reintentar cargar objetivo compartido:`, error);
            alert(`Error: ${error.message}`);
        }
    }
    
    // API pública
    return {
        init,
        showMyGoalsTab,
        showSharedGoalsTab,
        showShareModal,
        hideShareModal,
        confirmShareGoal,
        showAccessModal,
        hideAccessModal,
        revokeAccess,
        loadSharedGoals,
        retryLoadSharedGoal
    };
})();

// Función global para compartir objetivo desde HTML
window.shareGoalDirect = function(goalIndex) {
    console.log("Función shareGoalDirect llamada directamente para el objetivo:", goalIndex);
    if (SharingManager) {
        SharingManager.showShareModal(goalIndex);
    } else {
        console.error("SharingManager no está definido");
        alert("Error: No se pudo acceder al administrador de compartición");
    }
};

// Exponer al objeto global para los botones
window.SharingManager = SharingManager;

// Inicializar automáticamente cuando se complete el evento walletConnected
document.addEventListener('walletConnected', function(event) {
    console.log("Evento walletConnected recibido en sharing.js");
    const { contract, userAccount } = event.detail;
    SharingManager.init(contract, userAccount);
});