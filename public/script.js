let currentUser = null;
let currentChat = null;
let lastMessageId = null;

const contacts = JSON.parse(localStorage.getItem("contacts")) || [];
const unread = JSON.parse(localStorage.getItem("unread")) || {};

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
});

// =========================
// SALVAR PERFIL
document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const file = document.getElementById("profilePic").files[0];

  let photo = currentUser.photo;

  if(file){
    const reader = new FileReader();
    reader.onload = async () => {
      photo = reader.result;
      await salvarPerfil(username, photo);
    }
    reader.readAsDataURL(file);
  } else {
    await salvarPerfil(username, photo);
  }
});

async function salvarPerfil(username, photo){
  await fetch("/saveProfile", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ id: currentUser.id, username, photo })
  });

  localStorage.setItem("username", username);

  currentUser.username = username;
  currentUser.photo = photo;

  document.getElementById("profilePreview").src = photo;

  renderContacts();
}

// =========================
// CONTATOS (SEM DUPLICAR + PONTO AZUL)
async function renderContacts(){
  const div = document.getElementById("contacts");
  div.innerHTML = "";

  for (let i = 0; i < contacts.length; i++) {

    const res = await fetch(`/getUser/${contacts[i].id}`);
    const user = await res.json();

    if(!user.error) contacts[i] = user;

    const el = document.createElement("div");
    el.className = "contact";

    el.innerHTML = `
      <img src="${user.photo || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}"
           style="width:30px;height:30px;border-radius:50%;margin-right:10px;">
      <span style="flex:1">${user.username}</span>
      ${unread[user.id] ? `<div style="width:10px;height:10px;background:blue;border-radius:50%;"></div>` : ""}
    `;

    el.style.display = "flex";
    el.style.alignItems = "center";

    el.style.userSelect = "none";
    el.style.webkitUserSelect = "none";
    el.style.webkitTapHighlightColor = "transparent";

    el.onclick = () => abrirChat(user);

    div.appendChild(el);
  }

  localStorage.setItem("contacts", JSON.stringify(contacts));
}

// =========================
// ABRIR CHAT (REMOVE PONTO AZUL)
async function abrirChat(user){

  const res = await fetch(`/getUser/${user.id}`);
  const updatedUser = await res.json();

  if(!updatedUser.error) user = updatedUser;

  currentChat = user;

  // remove notificação
  delete unread[user.id];
  localStorage.setItem("unread", JSON.stringify(unread));

  document.getElementById("home").style.display = "none";
  document.getElementById("chatScreen").style.display = "flex";

  document.getElementById("chatName").textContent = user.username;

  document.getElementById("chatAvatar").src =
    user.photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  lastMessageId = null;
  await loadMessages(true);

  renderContacts(); // atualiza lista
}

// =========================
// VOLTAR
function voltar(){
  document.getElementById("chatScreen").style.display = "none";
  document.getElementById("home").style.display = "block";
  currentChat = null;
}

// =========================
// ADICIONAR CONTATO (ANTI DUPLICADO)
document.getElementById("addFriendBtn").onclick = async () => {

  const id = document.getElementById("addUserId").value;

  const res = await fetch(`/getUser/${id}`);
  const user = await res.json();

  if(user.error) return alert("Não encontrado");

  // 🔥 NÃO DUPLICA
  if(!contacts.some(c => c.id == user.id)){
    contacts.push(user);
    localStorage.setItem("contacts", JSON.stringify(contacts));
    renderContacts();
  }
};

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
      text
    })
  });

  document.getElementById("messageText").value = "";

  addMessage({
    fromId: currentUser.id,
    text
  }, currentUser);
};

// =========================
// RECEBER MENSAGENS (NOVAS + PONTO AZUL + AUTO CONTATO)
async function loadMessages(initial = false){

  const res = await fetch(`/getMessages/${currentUser.id}`);
  const msgs = await res.json();

  // 🔥 NOVAS MENSAGENS
  if(!initial){
    for(let m of msgs){

      if(m.toId == currentUser.id){

        // adiciona contato se não existir
        if(!contacts.some(c => c.id == m.fromId)){
          const resUser = await fetch(`/getUser/${m.fromId}`);
          const newUser = await resUser.json();

          if(!newUser.error){
            contacts.push(newUser);
            localStorage.setItem("contacts", JSON.stringify(contacts));
          }
        }

        // marca como não lido
        if(!currentChat || currentChat.id != m.fromId){
          unread[m.fromId] = true;
          localStorage.setItem("unread", JSON.stringify(unread));
        }
      }
    }

    renderContacts();
    return;
  }

  // ================= CHAT ABERTO
  if(!currentChat) return;

  const filtered = msgs.filter(m =>
    (m.fromId == currentUser.id && m.toId == currentChat.id) ||
    (m.fromId == currentChat.id && m.toId == currentUser.id)
  );

  const usersCache = {};

  for (let m of filtered){
    if(!usersCache[m.fromId]){
      const resUser = await fetch(`/getUser/${m.fromId}`);
      usersCache[m.fromId] = await resUser.json();
    }
  }

  const container = document.getElementById("messages");
  container.innerHTML = "";

  let html = "";

  for (let m of filtered){
    const user = usersCache[m.fromId];
    const isMe = m.fromId == currentUser.id;

    html += `
      <div class="message ${isMe ? "me" : "other"}">
        ${!isMe ? `<img class="avatar" src="${user?.photo || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}">` : ""}
        <div class="bubble">${m.text}</div>
        ${isMe ? `<img class="avatar" src="${user?.photo || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}">` : ""}
      </div>
    `;
  }

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

// =========================
setInterval(() => {
  loadMessages(false);
}, 2000);
