// --- Initial Setup ---
(function() {
    emailjs.init("TJurSHmPPRSr9b4Xp"); 
})();

// ADMIN KE FIXED CREDENTIALS (Yahan aap badal sakte hain)
const FIXED_ADMIN = {
    name: "Virendra Kumar Yadav",          
    email: "esyssuresh@gmail.com",     
    id: "IET1234"                
};

let generatedOTP;
let authRole = '';
let activeUser = null;
let pendingPaymentIndex = null;

// --- Navigation ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    window.scrollTo(0, 0);
}

// --- Auth System ---
function initiateAuth(role) {
    authRole = role;
    document.getElementById('authTitle').innerText = role.toUpperCase() + " LOGIN";
    document.getElementById('otpStep1').style.display = 'block';
    document.getElementById('otpStep2').style.display = 'none';
    showPage('authPage');
}

function sendVerificationOTP() {
    const email = document.getElementById('loginEmail').value;
    const name = document.getElementById('loginName').value;
    const id = document.getElementById('loginID').value;
    
    if(!email || !name || !id) {
        alert("Please enter Name, Email and ID");
        return;
    }

    // --- VALIDATION BEFORE SENDING OTP ---
    if(authRole === 'admin') {
        if(name !== FIXED_ADMIN.name || email !== FIXED_ADMIN.email || id !== FIXED_ADMIN.id) {
            alert("Access Denied! Invalid Admin Credentials. OTP cannot be sent.");
            return; // Function yahi ruk jayega
        }
    }

    // 6-digit OTP generate karna
    generatedOTP = Math.floor(100000 + Math.random() * 900000);
    
    const templateParams = {
        to_name: name,
        to_email: email,
        otp_code: generatedOTP, 
        message: "Your IET Library security OTP is: " + generatedOTP,
        otp: generatedOTP
    };

    emailjs.send("service_530cp7o", "template_frgwn2s", templateParams)
        .then(() => {
            alert("OTP Sent Successfully to " + email);
            document.getElementById('otpStep1').style.display = 'none';
            document.getElementById('otpStep2').style.display = 'block';
        }, (error) => {
            alert("EmailJS Error: " + JSON.stringify(error));
        });
}

function verifyAndLogin() {
    const userOtp = document.getElementById('otpInput').value;
    if(userOtp == generatedOTP) {
        if(authRole === 'admin') {
            activeUser = FIXED_ADMIN;
            showPage('adminDashboard');
            renderAdminTable('all');
        } else {
            activeUser = {
                name: document.getElementById('loginName').value,
                email: document.getElementById('loginEmail').value,
                id: document.getElementById('loginID').value
            };
            loadStudentData();
        }
    } else {
        alert("Incorrect OTP. Please try again.");
    }
}

// --- Admin Features ---
function saveIssueRecord() {
    const data = {
        name: document.getElementById('stName').value,
        roll: document.getElementById('stRoll').value,
        email: document.getElementById('stEmail').value,
        book: document.getElementById('stBook').value,
        issue: document.getElementById('stIssueDate').value,
        ret: document.getElementById('stReturnDate').value,
        timestamp: new Date().getTime()
    };

    if(!data.name || !data.email || !data.ret) {
        alert("Please fill all fields");
        return;
    }

    let list = JSON.parse(localStorage.getItem("issuedBooks")) || [];
    list.push(data);
    localStorage.setItem("issuedBooks", JSON.stringify(list));
    
    alert("Book Issued Successfully!");
    renderAdminTable('all');
    showPage('issuedLogsPage');
}

function renderAdminTable(filter) {
    const list = JSON.parse(localStorage.getItem("issuedBooks")) || [];
    const tbody = document.getElementById("bookList");
    const now = new Date();
    tbody.innerHTML = "";

    list.filter(item => {
        const d = new Date(item.issue);
        if(filter === 'week') return (now - d) / 864e5 <= 7;
        if(filter === 'month') return d.getMonth() === now.getMonth();
        return true;
    }).forEach((item, index) => {
        const f = calculateFine(item.ret);
        tbody.innerHTML += `
            <tr>
                <td>${item.name}<br><small>${item.roll}</small></td>
                <td>${item.book}</td>
                <td>${item.ret}</td>
                <td class="${f.fine > 0 ? 'overdue-status' : 'ontime-status'}">${f.status}</td>
                <td>₹${f.fine}</td>
                <td><button onclick="deleteRow(${index})" class="delete-btn"><i class="fas fa-trash"></i></button></td>
            </tr>`;
    });
}

// --- Student Features ---
function loadStudentData() {
    showPage('studentDashboard');
    document.getElementById('studentProfile').innerHTML = `<b>Name:</b> ${activeUser.name} | <b>Roll:</b> ${activeUser.id}`;
    
    const list = JSON.parse(localStorage.getItem("issuedBooks")) || [];
    const tbody = document.getElementById('studentBookList');
    tbody.innerHTML = "";
    
    let found = false;
    list.forEach((item, index) => {
        if(item.email === activeUser.email || item.roll === activeUser.id) {
            found = true;
            const f = calculateFine(item.ret);
            let actionBtn = f.fine > 0 ? `<button onclick="openPayment(${index})" class="pay-btn">Pay Fine</button>` : `<span style="color:gray">Cleared</span>`;
            
            tbody.innerHTML += `
                <tr>
                    <td>${item.book}</td>
                    <td>${item.ret}</td>
                    <td class="${f.fine > 0 ? 'overdue-status' : 'ontime-status'}">${f.status}</td>
                    <td>₹${f.fine}</td>
                    <td>${actionBtn}</td>
                </tr>`;
        }
    });
    if(!found) tbody.innerHTML = "<tr><td colspan='5'>No records found.</td></tr>";
}

function calculateFine(dueDateStr) {
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = Math.ceil((today - dueDate) / (1000*60*60*24));
    
    return { 
        fine: diff > 0 ? diff * 2 : 0, 
        status: diff > 0 ? "Overdue" : "On Time" 
    };
}

function logout() {
    location.reload();
}

// --- Payment & Delete Functions ---
function openPayment(index) {
    pendingPaymentIndex = index;
    document.getElementById('paymentModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

function confirmPayment() {
    if(pendingPaymentIndex !== null) {
        deleteRow(pendingPaymentIndex);
        closeModal();
        alert("Payment Confirmed! Your record has been cleared.");
        loadStudentData();
    }
}

function deleteRow(index) {
    let list = JSON.parse(localStorage.getItem("issuedBooks")) || [];
    list.splice(index, 1);
    localStorage.setItem("issuedBooks", JSON.stringify(list));
    renderAdminTable('all'); 
}

// --- E-Books Filtering & Search ---
function filterBooks(branch) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll(".classic-book-card").forEach(c => {
        c.style.display = (branch === 'All' || c.dataset.category === branch) ? "block" : "none";
    });
}

function searchBooks() {
    const val = document.getElementById("searchBook").value.toLowerCase();
    document.querySelectorAll(".classic-book-card").forEach(c => {
        const text = c.innerText.toLowerCase();
        c.style.display = text.includes(val) ? "block" : "none";
    });
}