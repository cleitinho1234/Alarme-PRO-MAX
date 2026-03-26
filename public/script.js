// ID fixo do usuário
let userId = localStorage.getItem("userId");
if (!userId) {
    userId = Math.floor(Math.random() * 1000000).toString();
    localStorage.setItem("userId", userId);
}

// Mostrar ID
document.getElementById("userIdDisplay").innerText = userId;

// Dados locais
let contacts = JSON.parse(localStorage.getItem("contacts")) || [];
let chats = JSON.parse(localStorage.getItem("chats")) || {};

// Elementos
const contactsDiv = document.getElementById("contacts");
const messagesDiv = document.getElementById("messages");

let currentChat = null;

// =====================
// SALVAR PERFIL
// =====================
document.getElementById("profileForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const file = document.getElementById("profilePic").files[0];

    const reader = new FileReader();
    reader.onload = () => {
        localStorage.setItem("profile", JSON.stringify({
            username,
            photo: reader.result
        }));

        document.getElementById("profilePreview").src = reader.result;
        alert("Perfil salvo!");
    };

    reader.readAsDataURL(file);
});

// =====================
// ADICIONAR CONTATO
// =====================
async function addFriend() {
    const friendId = document.getElementById("addUserId").value;

    const res = await fetch(`/getUser/${friendId}`);

    if (res.ok) {
        const user = await res.json();

        const contact = {
            id: friendId,
            name: user.username,
            photo: user.photo
        };

        contacts.push(contact);
        localStorage.setItem("contacts", JSON.stringify(contacts));

        renderContacts();
    } else {
        alert("ID não encontrado");
    }
}

// =====================
// MOSTRAR CONTATOS
// =====================
function renderContacts() {
    contactsDiv.innerHTML = "";

    contacts.forEach(c => {
        const div = document.createElement("div");

        div.innerHTML = `
            <img src="${c.photo}" width="40" style="border-radius:50%">
            ${c.name}
        `;

        div.style.cursor = "pointer";

        div.onclick = () => openChat(c.id);

        contactsDiv.appendChild(div);
    });
}

// =====================
// ABRIR CHAT
// =====================
function openChat(friendId) {
    currentChat = friendId;
    loadMessages();
}

// =====================
// ENVIAR MENSAGEM
// =====================
async function sendMessage() {
    const text = document.getElementById("messageText").value;

    if (!currentChat || !text) return;

    if (!chats[currentChat]) chats[currentChat] = [];

    chats[currentChat].push({
        from: userId,
        text
    });

    localStorage.setItem("chats", JSON.stringify(chats));

    await fetch("/sendMessage", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            fromId: userId,
            toId: currentChat,
            text
        })
    });

    document.getElementById("messageText").value = "";
    loadMessages();
}

// =====================
// CARREGAR MENSAGENS
// =====================
function loadMessages() {
    messagesDiv.innerHTML = "";

    const chat = chats[currentChat] || [];

    chat.forEach(m => {
        const div = document.createElement("div");

        div.innerText = (m.from === userId ? "Você: " : "Ele: ") + m.text;

        messagesDiv.appendChild(div);
    });
}

// =====================
// INICIAR
// =====================
renderContacts();
