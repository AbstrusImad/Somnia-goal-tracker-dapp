
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
    const shareModal = document.getElementById('share-modal');
    const shareAddress = document.getElementById('share-address');
    const shareName = document.getElementById('share-name');
    const shareRole = document.getElementById('share-role');
    const shareCancel = document.getElementById('share-cancel');
    const shareConfirm = document.getElementById('share-confirm');
    const accessModal = document.getElementById('access-modal');
    const usersList = document.getElementById('users-list');
    const accessDone = document.getElementById('access-done');
    const addUserBtn = document.getElementById('add-user-button');
    const sharedGoalsList = document.getElementById('shared-goals-list');
    const sharedGoalsCount = document.getElementById('shared-goals-count');
    
    // Tab elements
    const tabMyGoals = document.getElementById('tab-my-goals');
    const tabSharedGoals = document.getElementById('tab-shared-goals');
    const contentMyGoals = document.getElementById('content-my-goals');
    const contentSharedGoals = document.getElementById('content-shared-goals');
    
    // Inicialización
    function init(contractInstance, account) {
        contract = contractInstance;
        userAccount = account;
        
        // Listeners
        shareCancel.addEventListener('click', hideShareModal);
        shareConfirm.addEventListener('click', confirmShareGoal);
        accessDone.addEventListener('click', hideAccessModal);
        addUserBtn.addEventListener('click', () => showShareModal(goalToManage));
        
        // Tab navigation
        tabMyGoals.addEventListener('click', showMyGoalsTab);
        tabSharedGoals.addEventListener('click', showSharedGoalsTab);
    }
    
    // Mostrar la pestaña de mis objetivos
    function showMyGoalsTab() {
        // Activar pestaña
        tabMyGoals.classList.add('active');
        tabSharedGoals.classList.remove('active');
        
        // Mostrar contenido
        contentMyGoals.classList.add('active');
        contentSharedGoals.classList.remove('active');
        
        // Cargar objetivos
        GoalManager.loadMyGoals();
    }
    
    // Mostrar la pestaña de objetivos compartidos
    function showSharedGoalsTab() {
        // Activar pestaña
        tabSharedGoals.classList.add('active');
        tabMyGoals.classList.remove('active');
        
        // Mostrar contenido
        contentSharedGoals.classList.add('active');
        contentMyGoals.classList.remove('active');
        
        // Cargar objetivos compartidos
        loadSharedGoals();
    }
    
    // Mostrar modal para compartir
    function showShareModal(goalIndex) {
        goalToShare = goalIndex;
        
        // Resetear campos
        shareAddress.value = '';
        shareName.value = '';
        shareRole.value = '1'; // Default: Viewer
        
        // Mostrar modal
        shareModal.classList.add('active');
    }
    
    // Ocultar modal para compartir
    function hideShareModal() {
        shareModal.classList.remove('active');
        goalToShare = -1;
    }
    
    // Confirmar compartir objetivo
    async function confirmShareGoal() {
        if (goalToShare < 0) return;
        
        try {
            const address = shareAddress.value.trim();
            const name = shareName.value.trim();
            const role = parseInt(shareRole.value);
            
            if (!ethers.utils.isAddress(address)) {
                alert("Por favor ingresa una dirección de wallet válida");
                return;
            }
            
            // Deshabilitar botón mientras se procesa
            shareConfirm.innerHTML = "<span class='loader'></span> Compartiendo...";
            shareConfirm.disabled = true;
            
            // Llamar al contrato
            const tx = await contract.grantAccess(goalToShare, address, role, name);
            await tx.wait();
            
            // Si estamos en el modal de gestión de acceso, actualizar la lista
            if (goalToManage >= 0) {
                loadGoalUsers(goalToManage);
            }
            
            hideShareModal();
            
        } catch (error) {
            console.error("Error al compartir objetivo:", error);
            alert(`Error: ${error.message}`);
        } finally {
            shareConfirm.innerHTML = "Compartir Objetivo";
            shareConfirm.disabled = false;
        }
    }
    
    // Mostrar modal de gestión de acceso
    function showAccessModal(goalIndex) {
        goalToManage = goalIndex;
        
        // Cargar usuarios con acceso a este objetivo
        loadGoalUsers(goalIndex);
        
        // Mostrar modal
        accessModal.classList.add('active');
    }
    
    // Ocultar modal de gestión de acceso
    function hideAccessModal() {
        accessModal.classList.remove('active');
        goalToManage = -1;
    }
    
    // Cargar usuarios con acceso a un objetivo
    async function loadGoalUsers(goalIndex) {
        try {
            const users = await contract.getGoalUsers(goalIndex);
            
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
                switch (user.role) {
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
                        <button onclick="SharingManager.revokeAccess('${user.userAddress}')" class="sf-button sf-button-danger">Revocar Acceso</button>
                    </div>
                `;
                
                usersList.appendChild(userElement);
            });
            
        } catch (error) {
            console.error("Error al cargar usuarios:", error);
            usersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-text">Error al cargar usuarios. Por favor intenta de nuevo.</div>
                </div>
            `;
        }
    }
    
    // Revocar acceso a un usuario
    async function revokeAccess(userAddress) {
        if (goalToManage < 0) return;
        
        try {
            // Llamar al contrato
            const tx = await contract.revokeAccess(goalToManage, userAddress);
            await tx.wait();
            
            // Actualizar lista de usuarios
            loadGoalUsers(goalToManage);
            
        } catch (error) {
            console.error("Error al revocar acceso:", error);
            alert(`Error: ${error.message}`);
        }
    }
    
    // Cargar objetivos compartidos conmigo
    async function loadSharedGoals() {
        try {
            const [owners, goalIndices] = await contract.getSharedWithMeGoals();
            
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
                const index = goalIndices[i].toNumber();
                
                // Obtener información detallada del objetivo
                try {
                    const [goals, indices] = await contract.getUserGoals(owner);
                    
                    // Encontrar el objetivo correcto
                    for (let j = 0; j < indices.length; j++) {
                        if (indices[j].toNumber() === index) {
                            // Renderizar el objetivo
                            renderSharedGoalItem(goals[j], owner, index);
                            break;
                        }
                    }
                } catch (error) {
                    console.error(`Error al cargar objetivo compartido (${owner}, ${index}):`, error);
                }
            }
            
        } catch (error) {
            console.error("Error al cargar objetivos compartidos:", error);
            sharedGoalsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-text">Error al cargar objetivos compartidos. Por favor intenta de nuevo.</div>
                </div>
            `;
        }
    }
    
    // Renderizar un objetivo compartido
    function renderSharedGoalItem(goal, owner, index) {
        const goalElement = document.createElement('div');
        
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const isExpired = !goal.completed && currentTimestamp > goal.deadline;
        
        if (goal.completed) {
            goalElement.className = 'goal-item completed fade-in';
        } else if (isExpired) {
            goalElement.className = 'goal-item expired fade-in';
        } else {
            goalElement.className = 'goal-item pending fade-in';
        }
        
        let statusBadge = '';
        if (goal.completed) {
            statusBadge = '<span class="status-badge badge-completed">Completado</span>';
        } else if (isExpired) {
            statusBadge = '<span class="status-badge badge-expired">Expirado</span>';
        } else {
            statusBadge = '<span class="status-badge badge-pending">En Progreso</span>';
        }
        
        const deadlineDate = new Date(goal.deadline.toNumber() * 1000).toLocaleDateString();
        
        // Verificar rol para mostrar acciones adecuadas
        const checkRoleAndRender = async () => {
            try {
                const role = await contract.getUserRole(owner, index, userAccount);
                
                // Construir acciones según el rol
                let actions = '';
                
                if (role >= 2 && !goal.completed && !isExpired) { // Editor o superior
                    actions += `
                        <button id="complete-button-${owner}-${index}" 
                            onclick="GoalManager.completeGoal('${owner}', ${index})" 
                            class="sf-button">Marcar Completado</button>
                        
                        <button onclick="GoalManager.showEditModal('${owner}', ${index}, '${goal.text}', ${goal.deadline})" 
                            class="sf-button">Editar</button>
                    `;
                }
                
                if (role >= 3) { // Admin
                    actions += `
                        <button onclick="GoalManager.showDeleteModal('${owner}', ${index})" 
                            class="sf-button sf-button-danger">Eliminar</button>
                    `;
                }
                
                // Añadir acciones al elemento
                goalElement.querySelector('.goal-actions').innerHTML = actions;
                
                // Añadir información sobre el rol
                let roleName;
                switch (role) {
                    case 1: roleName = 'Visor'; break;
                    case 2: roleName = 'Editor'; break;
                    case 3: roleName = 'Admin'; break;
                    default: roleName = 'Desconocido';
                }
                
                const roleElement = document.createElement('div');
                roleElement.className = 'goal-role';
                roleElement.innerHTML = `<span class="status-badge badge-role">Tu rol: ${roleName}</span>`;
                
                goalElement.querySelector('.goal-deadline').after(roleElement);
                
            } catch (error) {
                console.error(`Error al verificar rol para (${owner}, ${index}):`, error);
            }
        };
        
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
            <div class="goal-actions">
                <span class="loader"></span> Cargando acciones...
            </div>
        `;
        
        sharedGoalsList.appendChild(goalElement);
        
        // Verificar rol y actualizar acciones
        checkRoleAndRender();
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
        loadSharedGoals
    };
})();

// Exponer al objeto global para los botones
window.SharingManager = SharingManager;