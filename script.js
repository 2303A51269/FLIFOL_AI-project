// ============== Project Data Structure ==============
let projectData = {};
let openTabs = {};
let currentFile = null;

// ============== Initialize ==============
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeProject();
});

function initializeProject() {
    projectData = {};
    openTabs = {};
    currentFile = null;
    updateFileTree();
    updateEditor();
}

// ============== Event Listeners ==============
function setupEventListeners() {
    // Toolbar buttons
    document.getElementById('addFolderBtn').addEventListener('click', () => openAddModal('folder'));
    document.getElementById('addFileBtn').addEventListener('click', () => openAddModal('file'));
    document.getElementById('saveCodeBtn').addEventListener('click', saveCurrentFile);
    document.getElementById('downloadBtn').addEventListener('click', downloadProject);
    document.getElementById('newProjectBtn').addEventListener('click', newProject);

    // AI Section
    document.getElementById('generateBtn').addEventListener('click', generateStructure);
    document.getElementById('aiPrompt').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') generateStructure();
    });

    // Modal
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal);
        });
    });

    document.getElementById('modalCancel').addEventListener('click', () => closeModal(document.getElementById('modal')));
    document.getElementById('modalConfirm').addEventListener('click', confirmAddItem);

    document.getElementById('confirmCancel').addEventListener('click', () => closeModal(document.getElementById('confirmModal')));
    document.getElementById('confirmOk').addEventListener('click', performConfirmedAction);

    // Code editor
    document.getElementById('codeEditor').addEventListener('input', updateCurrentFile);
}

// ============== File Tree Management ==============
function updateFileTree() {
    const fileTree = document.getElementById('fileTree');
    
    if (Object.keys(projectData).length === 0) {
        fileTree.innerHTML = `<div class="tree-item empty-state"><p>No files yet. Add files or generate structure.</p></div>`;
        return;
    }

    fileTree.innerHTML = '';
    renderTree(projectData, fileTree, '');
}

function renderTree(obj, container, parentPath) {
    Object.entries(obj).forEach(([name, content]) => {
        const itemPath = parentPath ? `${parentPath}/${name}` : name;
        const isFolder = typeof content === 'object' && content !== null && !content.code;

        const treeItem = document.createElement('div');
        treeItem.className = 'tree-item';

        if (isFolder) {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'file-item folder';
            folderDiv.textContent = `📁 ${name}`;
            treeItem.appendChild(folderDiv);

            const subContainer = document.createElement('div');
            subContainer.style.marginLeft = '20px';
            renderTree(content, subContainer, itemPath);
            treeItem.appendChild(subContainer);
        } else {
            const fileDiv = document.createElement('div');
            fileDiv.className = `file-item file ${currentFile === itemPath ? 'active' : ''}`;
            fileDiv.textContent = `📄 ${name}`;
            fileDiv.addEventListener('click', () => openFile(itemPath, content.code));
            
            // Right-click menu
            fileDiv.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e, itemPath, true);
            });

            treeItem.appendChild(fileDiv);
        }

        container.appendChild(treeItem);
    });
}

function openFile(path, code) {
    currentFile = path;
    openTabs[path] = code;
    updateFileTree();
    updateEditor();
    updateTabs();
}

function saveCurrentFile() {
    if (!currentFile) {
        alert('Please select a file to save.');
        return;
    }

    const code = document.getElementById('codeEditor').value;
    setNestedProperty(projectData, currentFile, { code });
    openTabs[currentFile] = code;
    
    showNotification('File saved successfully!');
}

function updateCurrentFile() {
    if (currentFile) {
        const code = document.getElementById('codeEditor').value;
        openTabs[currentFile] = code;
    }
}

// ============== Editor Management ==============
function updateEditor() {
    const editor = document.getElementById('codeEditor');
    const fileInfo = document.getElementById('fileInfo');

    if (currentFile) {
        editor.value = openTabs[currentFile] || getFileContent(currentFile);
        fileInfo.textContent = `📄 ${currentFile}`;
        editor.style.display = 'block';
    } else {
        editor.value = '';
        editor.style.display = 'none';
        fileInfo.textContent = 'No file selected';
    }
}

function updateTabs() {
    const tabContainer = document.getElementById('tabContainer');
    
    if (Object.keys(openTabs).length === 0) {
        tabContainer.innerHTML = '<div class="empty-tab"><p>Select a file to edit</p></div>';
        return;
    }

    tabContainer.innerHTML = '';
    Object.keys(openTabs).forEach(path => {
        const tab = document.createElement('button');
        tab.className = `file-tab ${currentFile === path ? 'active' : ''}`;
        tab.innerHTML = `📄 ${path.split('/').pop()} <span class="file-tab-close">×</span>`;
        
        tab.addEventListener('click', () => openFile(path, openTabs[path]));
        tab.querySelector('.file-tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(path);
        });

        tabContainer.appendChild(tab);
    });
}

function closeTab(path) {
    delete openTabs[path];
    if (currentFile === path) {
        currentFile = Object.keys(openTabs)[0] || null;
    }
    updateTabs();
    updateEditor();
}

function getFileContent(path) {
    const parts = path.split('/');
    let current = projectData;
    
    for (let part of parts) {
        if (current[part]) {
            current = current[part];
        } else {
            return '';
        }
    }
    
    return current.code || '';
}

// ============== Modal Management ==============
let modalMode = null;

function openAddModal(type) {
    modalMode = type;
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalNote = document.getElementById('modalNote');
    const itemName = document.getElementById('itemName');

    modalTitle.textContent = type === 'folder' ? 'Add Folder' : 'Add File';
    modalNote.textContent = type === 'folder' 
        ? 'Example: frontend, backend, src' 
        : 'Example: index.html, style.css, script.js';
    
    itemName.value = '';
    itemName.focus();
    modal.classList.add('show');
}

function closeModal(modal) {
    modal.classList.remove('show');
}

function confirmAddItem() {
    const name = document.getElementById('itemName').value.trim();
    
    if (!name) {
        alert('Please enter a name.');
        return;
    }

    if (modalMode === 'folder') {
        addFolder(name);
    } else {
        addFile(name);
    }

    closeModal(document.getElementById('modal'));
    updateFileTree();
}

// ============== File/Folder Operations ==============
function addFolder(name) {
    if (!projectData[name]) {
        projectData[name] = {};
    }
}

function addFile(name) {
    const parts = name.split('/');
    let current = projectData;

    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }

    const fileName = parts[parts.length - 1];
    current[fileName] = { code: getDefaultTemplate(fileName) };
}

function getDefaultTemplate(fileName) {
    const templates = {
        'index.html': '<!DOCTYPE html>\n<html>\n<head>\n    <title>Page</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    <h1>Hello World</h1>\n    <script src="script.js"></script>\n</body>\n</html>',
        'style.css': '* {\n    margin: 0;\n    padding: 0;\n    box-sizing: border-box;\n}\n\nbody {\n    font-family: Arial, sans-serif;\n    background-color: #f0f0f0;\n}',
        'script.js': '// Write your JavaScript here\nconsole.log("Hello from JavaScript!");',
        'server.js': 'const http = require("http");\n\nconst server = http.createServer((req, res) => {\n    res.writeHead(200, {"Content-Type": "text/plain"});\n    res.end("Server is running!");\n});\n\nserver.listen(3000, () => {\n    console.log("Server running on port 3000");\n});',
        'login.html': '<!DOCTYPE html>\n<html>\n<head>\n    <title>Login</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    <div class="login-container">\n        <h2>Login</h2>\n        <form>\n            <input type="text" placeholder="Username" required>\n            <input type="password" placeholder="Password" required>\n            <button type="submit">Login</button>\n        </form>\n    </div>\n</body>\n</html>',
        'package.json': '{\n  "name": "my-project",\n  "version": "1.0.0",\n  "description": "My Node.js project",\n  "main": "server.js",\n  "scripts": {\n    "start": "node server.js"\n  },\n  "dependencies": {}\n}'
    };

    return templates[fileName] || '// New file\n';
}

// ============== AI Structure Generation ==============
function generateStructure() {
    const prompt = document.getElementById('aiPrompt').value.trim();
    
    if (!prompt) {
        alert('Please enter a description of your project.');
        return;
    }

    const aiResponse = document.getElementById('aiResponse');
    
    // Show processing message
    aiResponse.textContent = '🤖 Analyzing your request...';
    aiResponse.classList.add('show');

    // Simulate AI processing
    setTimeout(() => {
        const structure = parsePromptAndGenerateStructure(prompt);
        
        if (structure.files.length > 0) {
            // Clear current project
            projectData = {};
            
            // Add generated files
            structure.files.forEach(filePath => {
                addFile(filePath);
            });

            updateFileTree();
            updateEditor();
            updateTabs();

            aiResponse.innerHTML = `✅ Generated ${structure.files.length} files:<br>${structure.files.map(f => f).join('<br>')}`;
            aiResponse.classList.add('show');

            // Clear after 5 seconds
            setTimeout(() => {
                aiResponse.classList.remove('show');
            }, 5000);
        } else {
            aiResponse.textContent = '❌ Could not understand your request. Try: "Create frontend with HTML CSS JS and backend Node"';
        }
    }, 500);
}

function parsePromptAndGenerateStructure(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    const files = [];

    // Frontend detection
    if (lowerPrompt.includes('frontend') || lowerPrompt.includes('html') || lowerPrompt.includes('react')) {
        if (lowerPrompt.includes('folder') || lowerPrompt.includes('structure')) {
            files.push('frontend/index.html');
            files.push('frontend/style.css');
            files.push('frontend/script.js');
        } else {
            if (lowerPrompt.includes('html')) files.push('index.html');
            if (lowerPrompt.includes('css') || lowerPrompt.includes('style')) files.push('style.css');
            if (lowerPrompt.includes('javascript') || lowerPrompt.includes('js') || lowerPrompt.includes('script')) files.push('script.js');
        }
    }

    // Login page
    if (lowerPrompt.includes('login')) {
        if (files.includes('frontend/index.html')) {
            files.push('frontend/login.html');
        } else {
            files.push('login.html');
        }
    }

    // Backend detection
    if (lowerPrompt.includes('backend') || lowerPrompt.includes('node') || lowerPrompt.includes('server')) {
        if (lowerPrompt.includes('folder') || lowerPrompt.includes('structure')) {
            files.push('backend/server.js');
            files.push('backend/package.json');
        } else {
            if (lowerPrompt.includes('node') || lowerPrompt.includes('server')) files.push('server.js');
            if (lowerPrompt.includes('package')) files.push('package.json');
        }
    }

    // Database
    if (lowerPrompt.includes('database') || lowerPrompt.includes('mongo') || lowerPrompt.includes('sql')) {
        if (files.some(f => f.includes('backend'))) {
            files.push('backend/db.js');
        } else {
            files.push('db.js');
        }
    }

    // API/Routes
    if (lowerPrompt.includes('api') || lowerPrompt.includes('route')) {
        if (files.some(f => f.includes('backend'))) {
            files.push('backend/routes.js');
        } else {
            files.push('routes.js');
        }
    }

    // Config file
    if (lowerPrompt.includes('config') || lowerPrompt.includes('env')) {
        files.push('.env');
    }

    // README
    if (lowerPrompt.includes('readme')) {
        files.push('README.md');
    }

    return { files: [...new Set(files)] };
}

// ============== Download Project ==============
async function downloadProject() {
    if (Object.keys(projectData).length === 0) {
        alert('Project is empty. Add some files first.');
        return;
    }

    try {
        const zip = new JSZip();
        addFilesToZip(projectData, zip);

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'FLIFOL-Project.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showNotification('Project downloaded successfully!');
    } catch (error) {
        alert('Error downloading project: ' + error.message);
    }
}

function addFilesToZip(obj, zipFolder, parentPath = '') {
    Object.entries(obj).forEach(([name, content]) => {
        const isFolder = typeof content === 'object' && content !== null && !content.code;

        if (isFolder) {
            const folder = zipFolder.folder(name);
            addFilesToZip(content, folder, parentPath ? `${parentPath}/${name}` : name);
        } else {
            zipFolder.file(name, content.code);
        }
    });
}

// ============== New Project ==============
function newProject() {
    if (Object.keys(projectData).length > 0) {
        const confirmModal = document.getElementById('confirmModal');
        document.getElementById('confirmMessage').textContent = 'Are you sure you want to create a new project? All unsaved changes will be lost.';
        
        window.confirmedAction = () => {
            initializeProject();
            closeModal(confirmModal);
        };

        confirmModal.classList.add('show');
    } else {
        initializeProject();
    }
}

function performConfirmedAction() {
    if (window.confirmedAction) {
        window.confirmedAction();
    }
    closeModal(document.getElementById('confirmModal'));
}

// ============== Utility Functions ==============
function setNestedProperty(obj, path, value) {
    const parts = path.split('/');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
}

function showNotification(message) {
    const aiResponse = document.getElementById('aiResponse');
    aiResponse.textContent = message;
    aiResponse.classList.add('show');

    setTimeout(() => {
        aiResponse.classList.remove('show');
    }, 3000);
}

function showContextMenu(e, itemPath, isFile) {
    // Simple context menu could be extended in future
    const action = confirm(`Delete ${isFile ? 'file' : 'folder'}: ${itemPath}?`);
    if (action) {
        deleteItem(itemPath);
        if (currentFile === itemPath) {
            currentFile = null;
            delete openTabs[itemPath];
            updateTabs();
            updateEditor();
        }
        updateFileTree();
    }
}

function deleteItem(path) {
    const parts = path.split('/');
    let current = projectData;

    for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]]) {
            current = current[parts[i]];
        } else {
            return;
        }
    }

    delete current[parts[parts.length - 1]];
}
