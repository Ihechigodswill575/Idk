// Blue Ocean Wealth - JavaScript with Firebase

const ADMIN_EMAIL = "ihechigodswill575@gmail.com";
const ACCOUNT_HOLDER = "Ogechi Chinonso Okonkwo";
const ACCOUNT_NUMBER = "7033572513";
const BANK_NAME = "Opay";

let currentUser = null;
let isAdmin = false;
let userData = {};

// Initialize Firebase and listen for auth changes
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        currentUser = user;
        isAdmin = user.email === ADMIN_EMAIL;
        
        // Load user data from database
        loadUserData(user.uid);
        
        // Show appropriate section
        if (isAdmin) {
            showAdminPanel();
        } else {
            showDashboard();
        }
    } else {
        currentUser = null;
        showAuthScreen();
    }
});

// ======================== AUTH FUNCTIONS ========================

function switchAuthTab(tab) {
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('signupForm').classList.remove('active');
    
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'login') {
        document.getElementById('loginForm').classList.add('active');
        btns[0].classList.add('active');
    } else {
        document.getElementById('signupForm').classList.add('active');
        btns[1].classList.add('active');
    }
}

function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    if (!email || !password) {
        errorDiv.textContent = 'Please enter email and password';
        return;
    }
    
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(() => {
            errorDiv.textContent = '';
        })
        .catch(error => {
            errorDiv.textContent = error.message;
        });
}

function signupUser() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const errorDiv = document.getElementById('signupError');
    
    if (!name || !email || !password) {
        errorDiv.textContent = 'All fields required';
        return;
    }
    
    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        return;
    }
    
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            // Create user data in database
            firebase.database().ref('users/' + userCredential.user.uid).set({
                name: name,
                email: email,
                balance: 0,
                available: 0,
                invested: 0,
                createdAt: new Date().toISOString()
            });
            errorDiv.textContent = '';
        })
        .catch(error => {
            errorDiv.textContent = error.message;
        });
}

function logoutUser() {
    firebase.auth().signOut();
}

// ======================== LOAD USER DATA ========================

function loadUserData(uid) {
    firebase.database().ref('users/' + uid).on('value', snapshot => {
        if (snapshot.exists()) {
            userData = snapshot.val();
            updateBalanceDisplay();
            document.getElementById('userEmail').textContent = currentUser.email;
            
            // Generate reference code
            const refCode = 'BOW' + uid.substring(0, 8).toUpperCase();
            document.getElementById('refCode').textContent = refCode;
        }
    });
    
    if (isAdmin) {
        loadPaymentRequests();
    }
}

// ======================== BALANCE DISPLAY ========================

function updateBalanceDisplay() {
    if (!userData) return;
    
    userData.balance = (userData.available || 0) + (userData.invested || 0);
    
    document.getElementById('balanceDisplay').textContent = '$' + (userData.balance || 0).toFixed(2);
    document.getElementById('available').textContent = '$' + (userData.available || 0).toFixed(2);
    document.getElementById('invested').textContent = '$' + (userData.invested || 0).toFixed(2);
}

function toggleBalance() {
    const display = document.getElementById('balanceDisplay');
    if (display.textContent === '••••') {
        display.textContent = '$' + userData.balance.toFixed(2);
    } else {
        display.textContent = '••••';
    }
}

// ======================== PAYMENT REQUEST ========================

function submitPaymentRequest() {
    const name = document.getElementById('rechargeName').value.trim();
    const amount = parseFloat(document.getElementById('rechargeAmount').value);
    const messageDiv = document.getElementById('paymentMessage');
    
    if (!name) {
        messageDiv.textContent = '❌ Please enter your full name';
        messageDiv.className = 'payment-message error';
        return;
    }
    
    if (!amount || amount <= 0) {
        messageDiv.textContent = '❌ Please enter a valid amount';
        messageDiv.className = 'payment-message error';
        return;
    }
    
    if (amount < 10) {
        messageDiv.textContent = '❌ Minimum recharge is $10';
        messageDiv.className = 'payment-message error';
        return;
    }
    
    const refCode = 'BOW' + currentUser.uid.substring(0, 8).toUpperCase();
    
    // Create payment request in database
    const paymentId = firebase.database().ref('paymentRequests').push().key;
    
    firebase.database().ref('paymentRequests/' + paymentId).set({
        id: paymentId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: name,
        amount: amount,
        referenceCode: refCode,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        approvedBy: null,
        declineReason: null
    }).then(() => {
        messageDiv.textContent = '✅ Payment request submitted! Waiting for admin approval...';
        messageDiv.className = 'payment-message success';
        
        // Clear form
        setTimeout(() => {
            document.getElementById('rechargeName').value = '';
            document.getElementById('rechargeAmount').value = '';
        }, 1000);
    }).catch(error => {
        messageDiv.textContent = '❌ Error: ' + error.message;
        messageDiv.className = 'payment-message error';
    });
}

function copyBankDetails() {
    const refCode = document.getElementById('refCode').textContent;
    const details = `
Account Holder: ${ACCOUNT_HOLDER}
Account Number: ${ACCOUNT_NUMBER}
Bank: ${BANK_NAME}
Reference Code: ${refCode}

Steps:
1. Copy these details
2. Make bank transfer using these details
3. Use Reference Code in the transfer description
4. Come back and submit payment request
    `.trim();
    
    navigator.clipboard.writeText(details).then(() => {
        alert('✅ Bank details copied to clipboard!');
    });
}

// ======================== ADMIN PANEL ========================

function loadPaymentRequests() {
    firebase.database().ref('paymentRequests').orderByChild('createdAt').on('value', snapshot => {
        const requests = [];
        let pendingCount = 0;
        let approvedCount = 0;
        let declinedCount = 0;
        
        snapshot.forEach(child => {
            const request = child.val();
            requests.push(request);
            
            const today = new Date().toDateString();
            const createdDate = new Date(request.createdAt).toDateString();
            
            if (request.status === 'pending') {
                pendingCount++;
            } else if (request.status === 'approved' && createdDate === today) {
                approvedCount++;
            } else if (request.status === 'declined' && createdDate === today) {
                declinedCount++;
            }
        });
        
        document.getElementById('pendingCount').textContent = pendingCount;
        document.getElementById('approvedCount').textContent = approvedCount;
        document.getElementById('declinedCount').textContent = declinedCount;
        
        // Show pending requests first
        const pendingRequests = requests.filter(r => r.status === 'pending').reverse();
        const otherRequests = requests.filter(r => r.status !== 'pending').reverse().slice(0, 10);
        const allRequests = [...pendingRequests, ...otherRequests];
        
        const container = document.getElementById('paymentRequests');
        if (allRequests.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No payment requests</p>';
            return;
        }
        
        container.innerHTML = allRequests.map(request => `
            <div class="payment-request-card ${request.status}">
                <div class="request-header">
                    <div>
                        <h3>${request.userName}</h3>
                        <p>${request.userEmail}</p>
                        <p class="request-date">${new Date(request.createdAt).toLocaleString()}</p>
                    </div>
                    <div class="request-amount">$${request.amount.toFixed(2)}</div>
                </div>
                
                <div class="request-details">
                    <div class="detail-row">
                        <span>Reference Code:</span>
                        <span class="code">${request.referenceCode}</span>
                    </div>
                    <div class="detail-row">
                        <span>Status:</span>
                        <span class="status-badge ${request.status}">${request.status.toUpperCase()}</span>
                    </div>
                </div>
                
                ${request.status === 'pending' ? `
                    <div class="request-actions">
                        <button class="btn-approve" onclick="approvePayment('${request.id}', '${request.userId}', ${request.amount})">✅ Approve</button>
                        <button class="btn-decline" onclick="declinePayment('${request.id}')">❌ Decline</button>
                    </div>
                ` : ''}
                
                ${request.status === 'approved' ? `
                    <div class="approval-info">
                        ✅ Approved by Admin<br>
                        ${new Date(request.updatedAt).toLocaleString()}
                    </div>
                ` : ''}
                
                ${request.status === 'declined' ? `
                    <div class="decline-info">
                        ❌ Declined: ${request.declineReason}
                    </div>
                ` : ''}
            </div>
        `).join('');
    });
}

function approvePayment(paymentId, userId, amount) {
    const reason = prompt('Optional: Add approval note (or leave empty):');
    if (reason === null) return;
    
    // Update payment status
    firebase.database().ref('paymentRequests/' + paymentId).update({
        status: 'approved',
        updatedAt: new Date().toISOString(),
        approvedBy: currentUser.email,
        approvalNote: reason
    });
    
    // Add funds to user account
    firebase.database().ref('users/' + userId).update({
        available: firebase.database.ServerValue.increment(amount)
    });
    
    alert('✅ Payment approved! Funds added to user account.');
}

function declinePayment(paymentId) {
    const reason = prompt('Why are you declining this payment?');
    if (!reason) {
        alert('Please provide a reason for declining');
        return;
    }
    
    firebase.database().ref('paymentRequests/' + paymentId).update({
        status: 'declined',
        updatedAt: new Date().toISOString(),
        declineReason: reason,
        declinedBy: currentUser.email
    });
    
    alert('❌ Payment declined. User will see the reason.');
}

// ======================== WITHDRAWAL ========================

function processWithdraw() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const bankAccount = document.getElementById('bankAccount').value;
    
    if (!amount || amount <= 0) {
        alert('❌ Please enter a valid amount');
        return;
    }
    
    if (amount < 50) {
        alert('❌ Minimum withdrawal is $50');
        return;
    }
    
    if (amount > userData.available) {
        alert('❌ Insufficient balance');
        return;
    }
    
    if (bankAccount === 'Select your bank account') {
        alert('❌ Please select a bank account');
        return;
    }
    
    if (confirm(`Request withdrawal of $${amount.toFixed(2)}?`)) {
        firebase.database().ref('users/' + currentUser.uid).update({
            available: firebase.database.ServerValue.increment(-amount)
        }).then(() => {
            alert('✅ Withdrawal request submitted!');
            document.getElementById('withdrawAmount').value = '';
        });
    }
}

// ======================== INVESTMENTS ========================

function investProduct(productType, minAmount) {
    const amount = prompt(`Enter investment amount (minimum: $${minAmount}):`);
    if (!amount) return;
    
    const investAmount = parseFloat(amount);
    
    if (isNaN(investAmount) || investAmount <= 0) {
        alert('❌ Invalid amount');
        return;
    }
    
    if (investAmount < minAmount) {
        alert(`❌ Minimum investment is $${minAmount}`);
        return;
    }
    
    if (investAmount > userData.available) {
        alert('❌ Insufficient balance');
        return;
    }
    
    const products = {
        'starter': { name: 'Starter Plan', rate: 4.2 },
        'premium': { name: 'Premium Growth', rate: 8.5 },
        'elite': { name: 'Elite Portfolio', rate: 12 }
    };
    
    const product = products[productType];
    
    if (confirm(`Invest $${investAmount.toFixed(2)} in ${product.name}?`)) {
        firebase.database().ref('users/' + currentUser.uid).update({
            available: firebase.database.ServerValue.increment(-investAmount),
            invested: firebase.database.ServerValue.increment(investAmount)
        }).then(() => {
            alert(`✅ Invested $${investAmount.toFixed(2)} in ${product.name}`);
        });
    }
}

// ======================== NAVIGATION ========================

function switchTab(tab) {
    const sections = document.querySelectorAll('.section-content');
    sections.forEach(s => s.classList.remove('active'));
    
    if (tab === 'home') {
        document.getElementById('home-section').classList.add('active');
    } else if (tab === 'profile') {
        showProfileSection();
    }
}

function openSection(section) {
    const sections = document.querySelectorAll('.section-content');
    sections.forEach(s => s.classList.remove('active'));
    
    document.getElementById(section + '-section').classList.add('active');
    window.scrollTo(0, 0);
}

function showProfileSection() {
    const sections = document.querySelectorAll('.section-content');
    sections.forEach(s => s.classList.remove('active'));
    
    const profileHtml = `
    <div class="section-content active" style="padding: 16px;">
        <h2>👤 My Profile</h2>
        <div class="info-box">
            <div class="bank-detail-row">
                <span class="label">Email</span>
                <span class="value">${currentUser.email}</span>
            </div>
            <div class="bank-detail-row">
                <span class="label">Total Balance</span>
                <span class="value">$${(userData.balance || 0).toFixed(2)}</span>
            </div>
            <div class="bank-detail-row">
                <span class="label">Available</span>
                <span class="value">$${(userData.available || 0).toFixed(2)}</span>
            </div>
            <div class="bank-detail-row">
                <span class="label">Invested</span>
                <span class="value">$${(userData.invested || 0).toFixed(2)}</span>
            </div>
        </div>
        <button class="btn-primary" onclick="logoutUser()" style="margin-top: 20px;">Logout</button>
    </div>
    `;
    
    document.querySelector('.main-content').innerHTML += profileHtml;
}

// ======================== CHAT ========================

function openChat() {
    document.getElementById('chatModal').classList.add('active');
}

function closeChat() {
    document.getElementById('chatModal').classList.remove('active');
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    addChatMessage(message, 'user');
    input.value = '';
    
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    setTimeout(() => {
        const responses = [
            "Thanks for your message! We're here to help.",
            "Your payment is being reviewed by the admin.",
            "Please ensure your name matches the bank transfer.",
            "Admin approval usually takes 1-24 hours.",
            "Use the reference code when making transfers.",
            "For issues, please contact the admin team.",
            "Your security is our priority.",
            "All transactions are verified before approval."
        ];
        
        const response = responses[Math.floor(Math.random() * responses.length)];
        addChatMessage(response, 'bot');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 800);
}

function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function addChatMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + sender;
    messageDiv.innerHTML = '<p>' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
    chatMessages.appendChild(messageDiv);
}

function closeTransactionModal() {
    document.getElementById('transactionModal').classList.remove('active');
}

// ======================== FAQ ========================

function toggleFaq(element) {
    const item = element.parentElement;
    item.classList.toggle('open');
}

// ======================== UI FUNCTIONS ========================

function showAuthScreen() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('dashboardSection').classList.add('dashboard-hidden');
    document.getElementById('adminSection').classList.add('dashboard-hidden');
}

function showDashboard() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').classList.remove('dashboard-hidden');
    document.getElementById('adminSection').classList.add('dashboard-hidden');
}

function showAdminPanel() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').classList.add('dashboard-hidden');
    document.getElementById('adminSection').classList.remove('dashboard-hidden');
}

// Initialize on load
window.addEventListener('load', () => {
    const carousel = document.getElementById('carousel');
    if (carousel) {
        let currentSlide = 0;
        const slides = carousel.querySelectorAll('.swipe-item');
        setInterval(() => {
            if (slides.length > 0) {
                currentSlide = (currentSlide + 1) % slides.length;
                carousel.scrollLeft = currentSlide * window.innerWidth;
            }
        }, 5000);
    }
});
