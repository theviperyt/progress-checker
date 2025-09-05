// Progress Tracker Application
class ProgressTracker {
    constructor() {
        this.progressItems = JSON.parse(localStorage.getItem('progressItems')) || [];
        this.currentEditId = null;
        this.currentTab = 'all';
        this.cachedElements = {};
        this.renderTimeout = null;
        this.saveTimeout = null;
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.renderProgressList();
        this.updateOverview();
        this.setupProgressSlider();
    }

    cacheElements() {
        this.cachedElements = {
            progressList: document.getElementById('progressList'),
            totalTasks: document.getElementById('totalTasks'),
            completedTasks: document.getElementById('completedTasks'),
            inProgressTasks: document.getElementById('inProgressTasks'),
            pendingTasks: document.getElementById('pendingTasks'),
            sectionTitle: document.getElementById('sectionTitle'),
            statusFilter: document.getElementById('statusFilter'),
            priorityFilter: document.getElementById('priorityFilter'),
            progressModal: document.getElementById('progressModal'),
            deleteModal: document.getElementById('deleteModal'),
            progressForm: document.getElementById('progressForm'),
            checklistContainer: document.getElementById('checklistContainer')
        };
    }

    bindEvents() {
        // Modal controls
        document.getElementById('addProgressBtn').addEventListener('click', () => this.openModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('closeDeleteModal').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());

        // Form submission
        this.cachedElements.progressForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Filters with debouncing
        this.cachedElements.statusFilter.addEventListener('change', () => this.debouncedRender());
        this.cachedElements.priorityFilter.addEventListener('change', () => this.debouncedRender());

        // Export functionality
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());

        // Checklist functionality
        document.getElementById('addChecklistItem').addEventListener('click', () => this.addChecklistItem());

        // Close modals when clicking outside
        this.cachedElements.progressModal.addEventListener('click', (e) => {
            if (e.target.id === 'progressModal') this.closeModal();
        });
        this.cachedElements.deleteModal.addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') this.closeDeleteModal();
        });
    }

    debouncedRender() {
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }
        this.renderTimeout = setTimeout(() => {
            this.renderProgressList();
        }, 100);
    }

    setupProgressSlider() {
        // Removed progress slider functionality as we now use checklist-based progress
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update section title
        const tabNames = {
            'all': 'All Tasks',
            'work': 'Work Tasks',
            'personal': 'Personal Tasks',
            'learning': 'Learning Tasks',
            'health': 'Health Tasks',
            'other': 'Other Tasks'
        };
        this.cachedElements.sectionTitle.textContent = tabNames[tabName];
        
        // Re-render the list
        this.renderProgressList();
    }

    addChecklistItem() {
        const container = this.cachedElements.checklistContainer;
        const newItem = document.createElement('div');
        newItem.className = 'checklist-item';
        newItem.innerHTML = `
            <input type="text" class="checklist-input" placeholder="Enter checklist item...">
            <button type="button" class="remove-checklist-item" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(newItem);
        
        // Focus on the new input
        newItem.querySelector('.checklist-input').focus();
    }

    openModal(editId = null) {
        this.currentEditId = editId;
        const modal = this.cachedElements.progressModal;
        const form = this.cachedElements.progressForm;
        const modalTitle = document.getElementById('modalTitle');

        if (editId) {
            modalTitle.textContent = 'Edit Progress';
            const item = this.progressItems.find(item => item.id === editId);
            if (item) {
                form.title.value = item.title;
                form.description.value = item.description || '';
                form.category.value = item.category || 'work';
                form.status.value = item.status;
                form.priority.value = item.priority;
                form.dueDate.value = item.dueDate || '';
                
                // Populate checklist
                this.populateChecklist(item.checklist || []);
            }
        } else {
            modalTitle.textContent = 'Add New Progress';
            form.reset();
            form.category.value = 'work';
            this.populateChecklist([]);
        }

        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    populateChecklist(checklistItems) {
        const container = this.cachedElements.checklistContainer;
        container.innerHTML = '';
        
        if (checklistItems.length === 0) {
            // Add one empty item
            this.addChecklistItem();
        } else {
            checklistItems.forEach(item => {
                const newItem = document.createElement('div');
                newItem.className = 'checklist-item';
                newItem.innerHTML = `
                    <input type="text" class="checklist-input" placeholder="Enter checklist item..." value="${this.escapeHtml(item.text)}">
                    <button type="button" class="remove-checklist-item" onclick="this.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                container.appendChild(newItem);
            });
        }
    }

    closeModal() {
        this.cachedElements.progressModal.classList.remove('show');
        document.body.style.overflow = 'auto';
        this.currentEditId = null;
    }

    openDeleteModal(deleteId) {
        this.currentDeleteId = deleteId;
        this.cachedElements.deleteModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeDeleteModal() {
        this.cachedElements.deleteModal.classList.remove('show');
        document.body.style.overflow = 'auto';
        this.currentDeleteId = null;
    }

    handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Collect checklist items
        const checklistItems = [];
        const checklistInputs = document.querySelectorAll('.checklist-input');
        checklistInputs.forEach(input => {
            if (input.value.trim()) {
                checklistItems.push({
                    text: input.value.trim(),
                    completed: false
                });
            }
        });

        const progressData = {
            id: this.currentEditId || this.generateId(),
            title: formData.get('title'),
            description: formData.get('description'),
            category: formData.get('category'),
            status: formData.get('status'),
            priority: formData.get('priority'),
            checklist: checklistItems,
            progress: this.calculateProgress(checklistItems),
            dueDate: formData.get('dueDate'),
            createdAt: this.currentEditId ? 
                this.progressItems.find(item => item.id === this.currentEditId).createdAt : 
                new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.currentEditId) {
            const index = this.progressItems.findIndex(item => item.id === this.currentEditId);
            this.progressItems[index] = progressData;
        } else {
            this.progressItems.unshift(progressData);
        }

        this.saveToLocalStorage();
        this.renderProgressList();
        this.updateOverview();
        this.closeModal();
        this.showNotification(this.currentEditId ? 'Progress updated successfully!' : 'Progress added successfully!');
    }

    calculateProgress(checklistItems) {
        if (checklistItems.length === 0) return 0;
        const completedItems = checklistItems.filter(item => item.completed).length;
        return Math.round((completedItems / checklistItems.length) * 100);
    }

    confirmDelete() {
        if (this.currentDeleteId) {
            this.progressItems = this.progressItems.filter(item => item.id !== this.currentDeleteId);
            this.saveToLocalStorage();
            this.renderProgressList();
            this.updateOverview();
            this.closeDeleteModal();
            this.showNotification('Progress deleted successfully!');
        }
    }

    renderProgressList() {
        const progressList = this.cachedElements.progressList;
        const statusFilter = this.cachedElements.statusFilter.value;
        const priorityFilter = this.cachedElements.priorityFilter.value;

        let filteredItems = this.progressItems;

        // Filter by tab
        if (this.currentTab !== 'all') {
            filteredItems = filteredItems.filter(item => item.category === this.currentTab);
        }

        // Filter by status
        if (statusFilter !== 'all') {
            filteredItems = filteredItems.filter(item => item.status === statusFilter);
        }

        // Filter by priority
        if (priorityFilter !== 'all') {
            filteredItems = filteredItems.filter(item => item.priority === priorityFilter);
        }

        if (filteredItems.length === 0) {
            const tabNames = {
                'all': 'progress items',
                'work': 'work tasks',
                'personal': 'personal tasks',
                'learning': 'learning tasks',
                'health': 'health tasks',
                'other': 'other tasks'
            };
            
            progressList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No ${tabNames[this.currentTab]} found</h3>
                    <p>Start by adding your first ${tabNames[this.currentTab]} to track your progress.</p>
                    <button class="btn btn-primary" onclick="progressTracker.openModal()">
                        <i class="fas fa-plus"></i>
                        Add Progress
                    </button>
                </div>
            `;
            return;
        }

        progressList.innerHTML = filteredItems.map(item => this.createProgressItemHTML(item)).join('');
    }

    createProgressItemHTML(item) {
        const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'completed';
        const dueDateText = item.dueDate ? 
            `<div class="due-date ${isOverdue ? 'overdue' : ''}">
                <i class="fas fa-calendar"></i>
                ${this.formatDate(item.dueDate)}
                ${isOverdue ? ' (Overdue)' : ''}
            </div>` : '';

        // Generate checklist HTML
        const checklistHTML = this.generateChecklistHTML(item);

        return `
            <div class="progress-item ${item.status}" data-id="${item.id}">
                <div class="progress-header">
                    <div>
                        <h3 class="progress-title">${this.escapeHtml(item.title)}</h3>
                        <p class="progress-description">${this.escapeHtml(item.description || '')}</p>
                    </div>
                    <div class="progress-meta">
                        <span class="status-badge ${item.status}">${item.status.replace('-', ' ')}</span>
                        <span class="priority-badge ${item.priority}">${item.priority}</span>
                        ${dueDateText}
                    </div>
                </div>
                ${checklistHTML}
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: ${item.progress}%"></div>
                    </div>
                    <div class="progress-percentage">${item.progress}%</div>
                </div>
                <div class="progress-actions">
                    <button class="btn btn-primary btn-small" onclick="progressTracker.openModal('${item.id}')">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="btn btn-danger btn-small" onclick="progressTracker.openDeleteModal('${item.id}')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    generateChecklistHTML(item) {
        if (!item.checklist || item.checklist.length === 0) {
            return '<div class="task-checklist"><p style="color: #718096; font-style: italic;">No checklist items</p></div>';
        }

        const completedCount = item.checklist.filter(task => task.completed).length;
        const totalCount = item.checklist.length;
        const progressText = `${completedCount}/${totalCount} completed`;

        const checklistItems = item.checklist.map((task, index) => `
            <div class="checklist-item-display">
                <input type="checkbox" class="checklist-checkbox" 
                       ${task.completed ? 'checked' : ''} 
                       onchange="progressTracker.toggleChecklistItem('${item.id}', ${index})">
                <span class="checklist-text ${task.completed ? 'completed' : ''}">${this.escapeHtml(task.text)}</span>
            </div>
        `).join('');

        return `
            <div class="task-checklist">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong>Checklist</strong>
                    <span class="checklist-progress">${progressText}</span>
                </div>
                ${checklistItems}
            </div>
        `;
    }

    toggleChecklistItem(itemId, taskIndex) {
        const item = this.progressItems.find(item => item.id === itemId);
        if (item && item.checklist && item.checklist[taskIndex]) {
            item.checklist[taskIndex].completed = !item.checklist[taskIndex].completed;
            const oldProgress = item.progress;
            item.progress = this.calculateProgress(item.checklist);
            
            // Update status based on progress
            const oldStatus = item.status;
            if (item.progress === 100) {
                item.status = 'completed';
            } else if (item.progress > 0) {
                item.status = 'in-progress';
            } else {
                item.status = 'pending';
            }
            
            // Only update UI if status or progress changed
            if (oldStatus !== item.status || oldProgress !== item.progress) {
                this.updateSingleItemUI(itemId, item);
                this.updateOverview();
            }
            
            this.saveToLocalStorage();
        }
    }

    updateSingleItemUI(itemId, item) {
        const itemElement = document.querySelector(`[data-id="${itemId}"]`);
        if (!itemElement) return;

        // Update progress bar
        const progressBarFill = itemElement.querySelector('.progress-bar-fill');
        const progressPercentage = itemElement.querySelector('.progress-percentage');
        if (progressBarFill) progressBarFill.style.width = `${item.progress}%`;
        if (progressPercentage) progressPercentage.textContent = `${item.progress}%`;

        // Update status badge
        const statusBadge = itemElement.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.className = `status-badge ${item.status}`;
            statusBadge.textContent = item.status.replace('-', ' ');
        }

        // Update item class for styling
        itemElement.className = `progress-item ${item.status}`;

        // Update checklist progress
        const checklistProgress = itemElement.querySelector('.checklist-progress');
        if (checklistProgress && item.checklist) {
            const completedCount = item.checklist.filter(task => task.completed).length;
            const totalCount = item.checklist.length;
            checklistProgress.textContent = `${completedCount}/${totalCount} completed`;
        }
    }

    updateOverview() {
        const totalTasks = this.progressItems.length;
        const completedTasks = this.progressItems.filter(item => item.status === 'completed').length;
        const inProgressTasks = this.progressItems.filter(item => item.status === 'in-progress').length;
        const pendingTasks = this.progressItems.filter(item => item.status === 'pending').length;

        this.cachedElements.totalTasks.textContent = totalTasks;
        this.cachedElements.completedTasks.textContent = completedTasks;
        this.cachedElements.inProgressTasks.textContent = inProgressTasks;
        this.cachedElements.pendingTasks.textContent = pendingTasks;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    saveToLocalStorage() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            localStorage.setItem('progressItems', JSON.stringify(this.progressItems));
        }, 100);
    }

    exportData() {
        const data = {
            exportDate: new Date().toISOString(),
            totalItems: this.progressItems.length,
            items: this.progressItems
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `progress-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotification('Data exported successfully!');
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(72, 187, 120, 0.4);
            z-index: 10000;
            font-weight: 600;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;

        // Add animation keyframes
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes slideOutRight {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the application
const progressTracker = new ProgressTracker();

// Add some sample data if no data exists
if (progressTracker.progressItems.length === 0) {
    const sampleData = [
        {
            id: 'sample-1',
            title: 'Complete Project Proposal',
            description: 'Draft and finalize the project proposal for the new client engagement.',
            category: 'work',
            status: 'in-progress',
            priority: 'high',
            checklist: [
                { text: 'Research client requirements', completed: true },
                { text: 'Create initial draft', completed: true },
                { text: 'Review with team', completed: false },
                { text: 'Finalize proposal', completed: false }
            ],
            progress: 50,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'sample-2',
            title: 'Learn New Framework',
            description: 'Study and practice with the latest JavaScript framework to stay updated.',
            category: 'learning',
            status: 'pending',
            priority: 'medium',
            checklist: [
                { text: 'Read documentation', completed: false },
                { text: 'Follow tutorial', completed: false },
                { text: 'Build practice project', completed: false }
            ],
            progress: 0,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'sample-3',
            title: 'Team Meeting Preparation',
            description: 'Prepare agenda and materials for the weekly team meeting.',
            category: 'work',
            status: 'completed',
            priority: 'low',
            checklist: [
                { text: 'Create meeting agenda', completed: true },
                { text: 'Prepare presentation slides', completed: true },
                { text: 'Send meeting invites', completed: true }
            ],
            progress: 100,
            dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'sample-4',
            title: 'Morning Workout Routine',
            description: 'Establish a consistent morning exercise routine for better health.',
            category: 'health',
            status: 'in-progress',
            priority: 'medium',
            checklist: [
                { text: 'Wake up at 6 AM', completed: true },
                { text: '30 minutes cardio', completed: true },
                { text: 'Strength training', completed: false },
                { text: 'Stretching routine', completed: false }
            ],
            progress: 50,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];

    progressTracker.progressItems = sampleData;
    progressTracker.saveToLocalStorage();
    progressTracker.renderProgressList();
    progressTracker.updateOverview();
}
