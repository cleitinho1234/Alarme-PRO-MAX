let currentUser = null;

let currentChat = null;

let contacts = JSON.parse(localStorage.getItem("contacts")) || [];

// 🔴 CONTROLE
let unreadCounts = JSON.parse(localStorage.getItem("unreadCounts")) || {};
let processedMessages = JSON.parse(localStorage.getItem("processedMessages")) || {};

// =========================

// INICIAR

window.addEventListener("load", async () => {

let savedId = localStorage.getItem("userId");

if (savedId) {
const res = await fetch(`/getUser/${savedId}`);
const user = await res.json();
if (!user.error) currentUser = user;
}

if (!currentUser) {
const res = await fetch("/user", {
  method: "POST",
  headers: {"Content-Type":"application/json"},
  body: JSON.stringify({ username: "Novo Usuário", photo: "" })
});
currentUser = await res.json();
localStorage.setItem("userId", currentUser.id);
}

document.getElementById("userIdDisplay").textContent = currentUser.id;

const savedName = localStorage.getItem("username");
if(savedName) currentUser.username = savedName;

if(currentUser.username){
document.getElementById("username").value = currentUser.username;
}

if(currentUser.photo){
document.getElementById("profilePreview").src = currentUser.photo;
}

renderContacts();

// 🔄 TEMPO REAL
setInterval(() => {
loadMessages(false);
}, 2000);

});

// =========================

// CONTATOS

async function renderContacts(){

const div = document.getElementById("contacts");
div.innerHTML = "";

for (let i = 0; i < contacts.length; i++) {

const res = await fetch(`/getUser/${contacts[i].id}`);
const user = await res.json();

if(!user.error) contacts[i] = user;

const count = unreadCounts[user.id] || 0;

const el = document.createElement("div");
el.className = "contact";

el.innerHTML = `
  <img src="${user.photo || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}"
       style="width:30px;height:30px;border-radius:50%;margin-right:10px;">
  <span style="flex:1;">${user.username}</span>
  ${count > 0 ? `<span style="background:red;color:white;border-radius:50%;padding:5px 10px;font-size:12px;margin-left:auto;">${count}</span>` : ""}
`;

el.style.display = "flex";
el.style.alignItems = "center";

el.onclick = () => abrirChat(user);

div.appendChild(el);

}

localStorage.setItem("contacts", JSON.stringify(contacts));

}

// =========================

// ABRIR CHAT

async function abrirChat(user){

const res = await fetch(`/getUser/${user.id}`);
const updatedUser = await res.json();

if(!updatedUser.error) user = updatedUser;

currentChat = user;

// 🔴 limpar contador
unreadCounts[user.id] = 0;
localStorage.setItem("unreadCounts", JSON.stringify(unreadCounts));

renderContacts();

document.getElementById("home").style.display = "none";
document.getElementById("chatScreen").style.display = "flex";

document.getElementById("chatName").textContent = user.username;

await loadMessages(true);

}

// =========================

// VOLTAR

function voltar(){
document.getElementById("chatScreen").style.display = "none";
document.getElementById("home").style.display = "block";
currentChat = null;
}

// =========================

// ENVIAR

document.getElementById("sendMessageBtn").onclick = async () => {

const text = document.getElementById("messageText").value;
if(!text || !currentChat) return;

await fetch("/sendMessage", {
method: "POST",
headers: {"Content-Type":"application/json"},
body: JSON.stringify({
  fromId: currentUser.id,
  toId: currentChat.id,
  text,
  timestamp: Date.now()
})
});

document.getElementById("messageText").value = "";

};

// =========================

// 🔥 LOAD MESSAGES CORRIGIDO

async function loadMessages(initial = false){

const res = await fetch(`/getMessages/${currentUser.id}`);
const msgs = await res.json();

// 🔥 AUTO CONTATO + CONTADOR (SEM LOOP)
let updated = false;

for (let m of msgs){

// auto contato
if(m.toId == currentUser.id && m.fromId != currentUser.id){

  if(!contacts.some(c => c.id == m.fromId)){
    const resUser = await fetch(`/getUser/${m.fromId}`);
    const newUser = await resUser.json();

    if(!newUser.error){
      contacts.push(newUser);
      updated = true;
    }
  }

}

// 🔴 contador sem repetir
if(m.toId == currentUser.id){

  if(!processedMessages[m.id]){

    processedMessages[m.id] = true;

    if(currentChat?.id !== m.fromId){

      if(!unreadCounts[m.fromId]){
        unreadCounts[m.fromId] = 0;
      }

      unreadCounts[m.fromId]++;

    }

  }

}

}

if(updated){
localStorage.setItem("contacts", JSON.stringify(contacts));
renderContacts();
}

localStorage.setItem("unreadCounts", JSON.stringify(unreadCounts));
localStorage.setItem("processedMessages", JSON.stringify(processedMessages));

// =========================
// CHAT

if(!currentChat) return;

const filtered = msgs.filter(m =>

(m.fromId == currentUser.id && m.toId == currentChat.id) ||
(m.fromId == currentChat.id && m.toId == currentUser.id)

);

const container = document.getElementById("messages");

// 🔥 CARREGAR INSTANTÂNEO
if(initial){

container.innerHTML = "";

let html = "";

for (let m of filtered){

  const isMe = m.fromId == currentUser.id;

  html += `
    <div class="message ${isMe ? "me" : "other"}">
      <div class="bubble">${m.text}</div>
    </div>
  `;
}

container.innerHTML = html;
container.scrollTop = container.scrollHeight;

return;
}

// 🔥 NOVAS MENSAGENS SEM DUPLICAR
for (let m of filtered){

if(processedMessages["chat_" + m.id]) continue;

processedMessages["chat_" + m.id] = true;

const isMe = m.fromId == currentUser.id;

const div = document.createElement("div");
div.className = "message " + (isMe ? "me" : "other");

const bubble = document.createElement("div");
bubble.className = "bubble";
bubble.textContent = m.text;

div.appendChild(bubble);

container.appendChild(div);

}

container.scrollTop = container.scrollHeight;

}

// =========================
