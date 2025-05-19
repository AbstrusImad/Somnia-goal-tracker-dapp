/**
 * goals.js
 * Maneja la funcionalidad relacionada con la creación y gestión de objetivos
 */

const GoalManager = (() => {
    // Variables locales
    let contract;
    let userAccount;
    let goalToDelete = -1;
    let goalToEdit = { owner: null, index: -1 };
    
    // DOM elements
    const goalText = document.getElementById('goal-text');
    const deadline = document.getElementById('deadline');
    const addGoalBtn = document.getElementById('add-goal');
    const goalsList = document.getElementById('goals-list');
    const deleteModal = document.getElementById('delete-modal');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    const editModal = document.getElementById('edit-modal');
    const editText = document.getElementById('edit-text');
    const editDeadline = document.getElementById('edit-deadline');
    const editCancel = document.getElementById('edit-cancel');
    const editConfirm = document.getElementById('edit-confirm');
    
    // Inicialización
    function init(contractInstance, account) {
        contract = contractInstance;
        userAccount = account;
        
        // Listeners
        addGoalBtn.addEventListener('click', createGoal);
        modalCancel.addEventListener('click', hideDeleteModal);
        modalConfirm.addEventListener('click', confirmDeleteGoal);
        editCancel.addEventListener('click', hideEditModal);
        editConfirm.addEventListener('click', confirmEditGoal);
        
        // Cargar objetivos iniciales
        loadMyGoals();
    }
    
    // Crear un nuevo objetivo
    async function createGoal() {
        try {
            const text = goalText.value.trim();
            const deadlineDate = new Date(deadline.value);
            
            if (!text) {
                alert("Por favor ingresa un objetivo");
                return;
            }
            
            if (isNaN(deadlineDate.getTime())) {
                alert("Por favor selecciona una fecha límite válida");
                return;
            }
            
            // Convertir fecha a timestamp Unix (segundos)
            const deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);
            
            // Deshabilitar botón mientras se procesa
            addGoalBtn.disabled = true;
            addGoalBtn.innerHTML = "<span class='loader'></span> Guardando...";
            
            // Llamar al contrato
            const tx = await contract.addGoal(text, deadlineTimestamp);
            await tx.wait();
            
            // Limpiar campos
            goalText.value = "";
            deadline.value = "";
            
            // Recargar objetivos
            loadMyGoals();
            
        } catch (error) {
            console.error("Error al crear objetivo:", error);
            alert(`Error: ${error.message}`);
        } finally {
            addGoalBtn.disabled = false;
            addGoalBtn.textContent = "Guardar Objetivo";
        }
    }
    
    // Marcar objetivo como completado
    async function completeGoal(owner, index) {
        try {
            const completeButton = document.getElementById(`complete-button-${owner}-${index}`);
            completeButton.innerHTML = "<span class='loader'></span> Procesando...";
            completeButton.disabled = true;
            
            const tx = await contract.completeGoal(owner, index);
            await tx.wait();
            
            // Recargar objetivos según la pestaña actual
            if (owner === userAccount) {
                loadMyGoals();
            } else {
                loadSharedGoals();
            }
            
        } catch (error) {
            console.error("Error al completar objetivo:", error);
            alert(`Error: ${error.message}`);
            const completeButton = document.getElementById(`complete-button-${owner}-${index}`);
            completeButton.textContent = "Marcar Completado";
            completeButton.disabled = false;
        }
    }
    
    // Mostrar modal de eliminación
    function showDeleteModal(owner, index) {
        goalToDelete = { owner, index };
        deleteModal.classList.add('active');
    }
    
    // Ocultar modal de eliminación
    function hideDeleteModal() {
        deleteModal.classList.remove('active');
        goalToDelete = { owner: null, index: -1 };
    }
    
    // Eliminar objetivo (después de confirmación)
    async function confirmDeleteGoal() {
        if (!goalToDelete.owner || goalToDelete.index < 0) return;
        
        try {
            modalConfirm.innerHTML = "<span class='loader'></span> Eliminando...";
            modalConfirm.disabled = true;
            
            const tx = await contract.deleteGoal(goalToDelete.owner, goalToDelete.index);
            await tx.wait();
            
            hideDeleteModal();
            
            // Recargar la vista correcta
            if (goalToDelete.owner === userAccount) {
                loadMyGoals();
            } else {
                loadSharedGoals();
            }
            
        } catch (error) {
            console.error("Error al eliminar objetivo:", error);
            alert(`Error: ${error.message}`);
        } finally {
            modalConfirm.innerHTML = "Eliminar Objetivo";
            modalConfirm.disabled = false;
        }
    }
    
    // Mostrar modal de edición
    function showEditModal(owner, index, text, deadlineTimestamp) {
        goalToEdit = { owner, index };
        
        // Llenar los campos con datos actuales
        editText.value = text;
        
        // Convertir timestamp a formato de fecha para el input
        const date = new Date(deadlineTimestamp * 1000);
        const formattedDate = date.toISOString().split('T')[0];
        editDeadline.value = formattedDate;
        
        // Mostrar modal
        editModal.classList.add('active');
    }
    
    // Ocultar modal de edición
    function hideEditModal() {
        editModal.classList.remove('active');
        goalToEdit = { owner: null, index: -1 };
    }
    
    // Editar objetivo (después de confirmar en el modal)
    async function confirmEditGoal() {
        if (!goalToEdit.owner || goalToEdit.index < 0) return;
        
        try {
            const text = editText.value.trim();
            const deadlineDate = new Date(editDeadline.value);
            
            if (!text) {
                alert("Por favor ingresa un texto para el objetivo");
                return;
            }
            
            if (isNaN(deadlineDate.getTime())) {
                alert("Por favor selecciona una fecha límite válida");
                return;
            }
            
            // Convertir fecha a timestamp Unix (segundos)
            const deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);
            
            // Deshabilitar botón mientras se procesa
            editConfirm.innerHTML = "<span class='loader'></span> Guardando...";
            editConfirm.disabled = true;
            
            // Llamar al contrato
            const tx = await contract.editGoal(
                goalToEdit.owner, 
                goalToEdit.index, 
                text, 
                deadlineTimestamp
            );
            await tx.wait();
            
            hideEditModal();
            
            // Recargar la vista correcta
            if (goalToEdit.owner === userAccount) {
                loadMyGoals();
            } else {
                loadSharedGoals();
            }
            
        } catch (error) {
            console.error("Error al editar objetivo:", error);
            alert(`Error: ${error.message}`);
        } finally {
            editConfirm.innerHTML = "Guardar Cambios";
            editConfirm.disabled = false;
        }
    }
    
    // Cargar mis objetivos
    async function loadMyGoals() {
        try {
            const [goals, indices] = await contract.getUserGoals(userAccount);
            
            // Limpiar lista
            goalsList.innerHTML = '';
            
            if (goals.length === 0) {
                goalsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <div class="empty-state-text">Aún no tienes objetivos. Añade tu primer objetivo arriba.</div>
                    </div>
                `;
                return;
            }
            
            // Añadir cada objetivo a la lista
            goals.forEach((goal, arrayIndex) => {
                const index = indices[arrayIndex].toNumber();
                renderGoalItem(goal, userAccount, index);
            });
            
        } catch (error) {
            console.error("Error al cargar objetivos:", error);
            goalsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-text">Error al cargar objetivos. Por favor intenta de nuevo.</div>
                </div>
            `;
        }
    }
    
    // Renderizar un elemento de objetivo
    function renderGoalItem(goal, owner, index) {
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
        
        // Mostrar propietario si es un objetivo compartido
        let ownerInfo = '';
        if (owner !== userAccount) {
            ownerInfo = `
                <div class="goal-owner">
                    <span class="goal-owner-icon">👤</span>
                    <span>Creado por: ${owner.substring(0, 6)}...${owner.substring(38)}</span>
                </div>
            `;
        }
        
        // Construir elemento HTML
        goalElement.innerHTML = `
            ${ownerInfo}
            <div class="goal-title">
                <span>${goal.text}</span>
                ${statusBadge}
            </div>
            <div class="goal-deadline">Fecha límite: ${deadlineDate}</div>
            <div class="goal-actions">
                ${!goal.completed && !isExpired ? 
                    `<button id="complete-button-${owner}-${index}" 
                        onclick="GoalManager.completeGoal('${owner}', ${index})" 
                        class="sf-button">Marcar Completado</button>` : ''}
                
                <button onclick="GoalManager.showEditModal('${owner}', ${index}, '${goal.text}', ${goal.deadline})" 
                    class="sf-button">Editar</button>
                
                <button onclick="GoalManager.showShareModal(${index})" 
                    class="sf-button">Compartir</button>
                
                <button onclick="GoalManager.showDeleteModal('${owner}', ${index})" 
                    class="sf-button sf-button-danger">Eliminar</button>
                
                <button onclick="GoalManager.showAccessModal(${index})"
                    class="sf-button">Gestionar Acceso</button>
            </div>
        `;
        
        goalsList.appendChild(goalElement);
    }
    
    // API pública
    return {
        init,
        createGoal,
        completeGoal,
        showDeleteModal,
        hideDeleteModal,
        confirmDeleteGoal,
        showEditModal,
        hideEditModal,
        confirmEditGoal,
        loadMyGoals
    };
})();

// Exponer al objeto global para los botones
window.GoalManager = GoalManager;