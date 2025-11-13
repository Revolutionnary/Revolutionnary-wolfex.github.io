// JSONBin.io Configuration
const API_URL = 'https://api.jsonbin.io/v3/b';
const USERS_BIN_ID = '69154878d0ea881f40e52de7';
const MESSAGES_BIN_ID = '69154878d0ea881f40e52de7'; // You can use same bin or create separate
const API_KEY = '$2a$10$4NfyVgkwl.bznTjox0vAKO0pRHUcyz08xIXVpqWX4e9kurX/p6TLK';

// Current user session
let currentUser = null;
let currentChatFriend = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    setupMessageRefresh();
});

// Check if user is logged in
function checkSession() {
    const session = localStorage.getItem('userSession');
    if (session) {
        currentUser = JSON.parse(session);
        showMainApp();
        loadUserData();
    } else {
        showAuthScreen();
    }
}

// Show auth screen
function showAuthScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('mainApp').classList.add('hidden');
}

// Show main app
function showMainApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').classList.remove('hidden');
    updateUserDisplay();
}

// Switch between login and signup
function showSignup() {
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('signupForm').classList.add('active');
}

function showLogin() {
    document.getElementById('signupForm').classList.remove('active');
    document.getElementById('loginForm').classList.add('active');
}

// Handle Signup
async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const date = document.getElementById('signupDate').value;
    const acceptTerms = document.getElementById('acceptTerms').checked;
    
    if (!acceptTerms) {
        alert('You must accept the terms and conditions');
        return;
    }
    
    try {
        // Get existing users
        const users = await getUsersFromAPI();
        
        // Check if email already exists
        if (users.find(u => u.email === email)) {
            alert('Email already registered!');
            return;
        }
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            name: name,
            email: email,
            password: password, // In production, hash this!
            dateOfBirth: date,
            friends: [],
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        await saveUsersToAPI(users);
        
        // Auto login
        currentUser = newUser;
        localStorage.setItem('userSession', JSON.stringify(newUser));
        showMainApp();
        loadUserData();
        
        alert('Account created successfully!');
    } catch (error) {
        console.error('Signup error:', error);
        alert('Error creating account. Please try again.');
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const users = await getUsersFromAPI();
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            currentUser = user;
            localStorage.setItem('userSession', JSON.stringify(user));
            showMainApp();
            loadUserData();
        } else {
            alert('Invalid email or password!');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Error logging in. Please try again.');
    }
}

// Handle Logout
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('userSession');
    showAuthScreen();
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('signupForm').classList.remove('active');
}

// Update user display
function updateUserDisplay() {
    if (currentUser) {
        document.getElementById('userNameDisplay').textContent = currentUser.name;
        document.getElementById('profileName').textContent = currentUser.name;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profileDate').textContent = 'Date of Birth: ' + currentUser.dateOfBirth;
    }
}

// Load user data
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        // Refresh user data from API
        const users = await getUsersFromAPI();
        const updatedUser = users.find(u => u.id === currentUser.id);
        if (updatedUser) {
            currentUser = updatedUser;
            localStorage.setItem('userSession', JSON.stringify(updatedUser));
        }
        
        updateStats();
        loadFriends();
        loadConversations();
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Update stats
function updateStats() {
    if (currentUser) {
        document.getElementById('friendsCount').textContent = currentUser.friends ? currentUser.friends.length : 0;
        
        // Count messages
        getMessagesFromAPI().then(messages => {
            const userMessages = messages.filter(m => 
                m.fromId === currentUser.id || m.toId === currentUser.id
            );
            document.getElementById('messagesCount').textContent = userMessages.length;
        });
    }
}

// Add Friend
async function addFriend() {
    const friendEmail = document.getElementById('friendEmail').value.trim();
    
    if (!friendEmail) {
        alert('Please enter an email');
        return;
    }
    
    if (friendEmail === currentUser.email) {
        alert('You cannot add yourself!');
        return;
    }
    
    try {
        const users = await getUsersFromAPI();
        const friend = users.find(u => u.email === friendEmail);
        
        if (!friend) {
            alert('User not found!');
            return;
        }
        
        if (!currentUser.friends) {
            currentUser.friends = [];
        }
        
        if (currentUser.friends.includes(friend.id)) {
            alert('Already friends!');
            return;
        }
        
        // Add friend to current user
        currentUser.friends.push(friend.id);
        
        // Add current user to friend's friends list
        if (!friend.friends) {
            friend.friends = [];
        }
        friend.friends.push(currentUser.id);
        
        // Update both users
        const updatedUsers = users.map(u => {
            if (u.id === currentUser.id) return currentUser;
            if (u.id === friend.id) return friend;
            return u;
        });
        
        await saveUsersToAPI(updatedUsers);
        localStorage.setItem('userSession', JSON.stringify(currentUser));
        
        document.getElementById('friendEmail').value = '';
        loadUserData();
        alert('Friend added successfully!');
    } catch (error) {
        console.error('Error adding friend:', error);
        alert('Error adding friend. Please try again.');
    }
}

// Load Friends
async function loadFriends() {
    if (!currentUser || !currentUser.friends) {
        document.getElementById('friendsList').innerHTML = '<p>No friends yet. Add some friends!</p>';
        document.getElementById('allFriendsList').innerHTML = '<p>No friends yet.</p>';
        return;
    }
    
    try {
        const users = await getUsersFromAPI();
        const friends = users.filter(u => currentUser.friends.includes(u.id));
        
        displayFriends(friends, 'friendsList');
        displayFriends(friends, 'allFriendsList');
    } catch (error) {
        console.error('Error loading friends:', error);
    }
}

// Display Friends
function displayFriends(friends, containerId) {
    const container = document.getElementById(containerId);
    
    if (friends.length === 0) {
        container.innerHTML = '<p>No friends yet.</p>';
        return;
    }
    
    container.innerHTML = friends.map(friend => `
        <div class="friend-card" onclick="openChat('${friend.id}', '${friend.name}')">
            <div class="friend-avatar">👤</div>
            <div class="friend-name">${escapeHtml(friend.name)}</div>
            <div class="friend-email">${escapeHtml(friend.email)}</div>
        </div>
    `).join('');
}

// Load Conversations
async function loadConversations() {
    if (!currentUser) return;
    
    try {
        const messages = await getMessagesFromAPI();
        const users = await getUsersFromAPI();
        
        // Get unique friend IDs from messages
        const friendIds = new Set();
        messages.forEach(m => {
            if (m.fromId === currentUser.id) friendIds.add(m.toId);
            if (m.toId === currentUser.id) friendIds.add(m.fromId);
        });
        
        // Add friends who might not have messages yet
        if (currentUser.friends) {
            currentUser.friends.forEach(id => friendIds.add(id));
        }
        
        const conversations = Array.from(friendIds).map(id => {
            const friend = users.find(u => u.id === id);
            if (!friend) return null;
            
            const friendMessages = messages.filter(m =>
                (m.fromId === currentUser.id && m.toId === id) ||
                (m.fromId === id && m.toId === currentUser.id)
            ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return {
                friend: friend,
                lastMessage: friendMessages[0] || null
            };
        }).filter(c => c !== null);
        
        displayConversations(conversations);
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

// Display Conversations
function displayConversations(conversations) {
    const container = document.getElementById('conversationsList');
    
    if (conversations.length === 0) {
        container.innerHTML = '<p>No conversations yet.</p>';
        return;
    }
    
    container.innerHTML = conversations.map(conv => {
        const preview = conv.lastMessage ? 
            (conv.lastMessage.fromId === currentUser.id ? 'You: ' : '') + conv.lastMessage.text :
            'No messages yet';
        
        return `
            <div class="conversation-item" onclick="openChat('${conv.friend.id}', '${conv.friend.name}')">
                <div class="conversation-name">${escapeHtml(conv.friend.name)}</div>
                <div class="conversation-preview">${escapeHtml(preview)}</div>
            </div>
        `;
    }).join('');
}

// Open Chat
function openChat(friendId, friendName) {
    currentChatFriend = { id: friendId, name: friendName };
    
    // Update active conversation
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show chat area
    document.getElementById('chatArea').classList.add('hidden');
    document.getElementById('chatInputArea').classList.remove('hidden');
    
    loadChatMessages(friendId);
}

// Load Chat Messages
async function loadChatMessages(friendId) {
    try {
        const messages = await getMessagesFromAPI();
        const chatMessages = messages.filter(m =>
            (m.fromId === currentUser.id && m.toId === friendId) ||
            (m.fromId === friendId && m.toId === currentUser.id)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        displayChatMessages(chatMessages);
    } catch (error) {
        console.error('Error loading chat messages:', error);
    }
}

// Display Chat Messages
function displayChatMessages(messages) {
    const container = document.getElementById('chatMessages');
    
    if (messages.length === 0) {
        container.innerHTML = '<p style="text-align: center; opacity: 0.5;">No messages yet. Start the conversation!</p>';
        return;
    }
    
    container.innerHTML = messages.map(msg => {
        const isSent = msg.fromId === currentUser.id;
        const date = new Date(msg.timestamp);
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="message ${isSent ? 'sent' : 'received'}">
                ${!isSent ? `<div class="message-sender">${escapeHtml(msg.fromName)}</div>` : ''}
                <div class="message-text">${escapeHtml(msg.text)}</div>
                <div class="message-time">${timeStr}</div>
            </div>
        `;
    }).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Send Message
async function sendMessage(e) {
    e.preventDefault();
    
    if (!currentChatFriend) return;
    
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    try {
        const messages = await getMessagesFromAPI();
        
        const newMessage = {
            id: Date.now().toString(),
            fromId: currentUser.id,
            fromName: currentUser.name,
            toId: currentChatFriend.id,
            toName: currentChatFriend.name,
            text: text,
            timestamp: new Date().toISOString()
        };
        
        messages.push(newMessage);
        await saveMessagesToAPI(messages);
        
        input.value = '';
        loadChatMessages(currentChatFriend.id);
        loadConversations();
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
    }
}

// Show Section
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
    
    // Show selected section
    document.getElementById(section + 'Section').classList.add('active');
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Reload data if needed
    if (section === 'friends' || section === 'home') {
        loadFriends();
    }
    if (section === 'messages') {
        loadConversations();
    }
}

// Setup message refresh
function setupMessageRefresh() {
    setInterval(() => {
        if (currentUser && currentChatFriend) {
            loadChatMessages(currentChatFriend.id);
        }
        if (currentUser) {
            loadConversations();
        }
    }, 3000); // Refresh every 3 seconds
}

// API Functions
async function getUsersFromAPI() {
    try {
        const response = await fetch(`${API_URL}/${USERS_BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': API_KEY,
                'X-Bin-Meta': 'false'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                await initializeUsersBin();
                return [];
            }
            throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        return data.record && data.record.users ? data.record.users : [];
    } catch (error) {
        console.error('API error:', error);
        return [];
    }
}

async function saveUsersToAPI(users) {
    try {
        const response = await fetch(`${API_URL}/${USERS_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify({ users })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save users');
        }
    } catch (error) {
        console.error('API save error:', error);
        throw error;
    }
}

async function getMessagesFromAPI() {
    try {
        const response = await fetch(`${API_URL}/${MESSAGES_BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': API_KEY,
                'X-Bin-Meta': 'false'
            }
        });
        
        if (!response.ok) {
            return [];
        }
        
        const data = await response.json();
        return data.record && data.record.messages ? data.record.messages : [];
    } catch (error) {
        console.error('API error:', error);
        return [];
    }
}

async function saveMessagesToAPI(messages) {
    try {
        const response = await fetch(`${API_URL}/${MESSAGES_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify({ messages })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save messages');
        }
    } catch (error) {
        console.error('API save error:', error);
        throw error;
    }
}

async function initializeUsersBin() {
    try {
        await fetch(`${API_URL}/${USERS_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify({ users: [], messages: [] })
        });
    } catch (error) {
        console.error('Error initializing bin:', error);
    }
}

// Utility
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

