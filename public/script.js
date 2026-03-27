let currentUser = null;
let currentChatId = null;
let lastMessageIds = new Set();

const contacts = JSON.parse(localStorage.getItem("contacts")) || [];

// =========================
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

  if(currentUser.username){
    document.getElementById("username").value = currentUser.username;
  }

  if(currentUser.photo){
    document.getElementById("profilePreview").src = currentUser.photo;
  }

  renderContacts();
  loadMessages();
});

// =========================
function renderContacts() {
  const div = document.getElementById("contacts");
  div.innerHTML = "";

  contacts.forEach(user => {
    const el = document.createElement("div");

    el.textContent =
      user.username + " (ID: " + user.id + ")" +
      (user.novo ? " 🟢" : "");

    el.onclick = () => openChat(user);

    div.appendChild(el);
  });
}

// =========================
function openChat(user){

  currentChatId = user.id;

  document.getElementById("chatHeader").style.display = "flex";
  document.getElementById("chatUserName").textContent = user.username;
  document.getElementById("chatUserPhoto").src =
    user.photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  document.getElementById("contacts").style.display = "none";
  document.getElementById("contactsTitle").style.display = "none";
  document.getElementById("addUserId").style.display = "none";
  document.getElementById("addFriendBtn").style.display = "none";

  document.getElementById("messages").style.display = "block";
  document.getElementById("messageText").style.display = "block";
  document.getElementById("sendMessageBtn").style.display = "block";

  user.novo = false;
  localStorage.setItem("contacts", JSON.stringify(contacts));
  renderContacts();

  lastMessageIds.clear();
  document.getElementById("messages").innerHTML = "";

  loadChatMessages();
}

// =========================
function voltar(){

  currentChatId = null;

  document.getElementById("chatHeader").style.display = "none";

  document.getElementById("contacts").style.display = "block";
  document.getElementById("contactsTitle").style.display = "block";
  document.getElementById("addUserId").style.display = "block";
  document.getElementById("addFriendBtn").style.display = "block";

  document.getElementById("messages").style.display = "none";
  document.getElementById("messageText").style.display = "none";
  document.getElementById("sendMessageBtn").style.display = "none";

  document.getElementById("messages").innerHTML = "";
}

// =========================
document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const file = document.getElementById("profilePic").files[0];
  let photo = currentUser.photo;

  if(file){
    const reader = new FileReader();
    reader.onload = async () => {
      photo = reader.result;
      await saveProfile(username, photo);
    }
    reader.readAsDataURL(file);
  } else {
    await saveProfile(username, photo);
  }
});

async function saveProfile(username, photo){
  await fetch("/saveProfile", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ id: currentUser.id, username, photo })
  });

  currentUser.username = username;
  currentUser.photo = photo;

  document.getElementById("profilePreview").src = photo;
}

// =========================
document.getElementById("addFriendBtn").addEventListener("click", async () => {

  const id = document.getElementById("addUserId").value.trim();
  if(!id) return;

  const res = await fetch(`/getUser/${id}`);
  const user = await res.json();

  if(!contacts.some(c => c.id === user.id)){
    contacts.push(user);
    localStorage.setItem("contacts", JSON.stringify(contacts));
    renderContacts();
  }

  document.getElementById("addUserId").value = "";
});

// =========================
document.getElementById("sendMessageBtn").addEventListener("click", async () => {

  const text = document.getElementById("messageText").value.trim();

  if(!text || !currentChatId) return;

  await fetch("/sendMessage", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      fromId: currentUser.id,
      toId: currentChatId,
      text
    })
  });

  document.getElementById("messageText").value = "";

  addMessage(text);
});

// =========================
function addMessage(text){

  const div = document.createElement("div");
  div.className = "message me";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = "Você: " + text;

  const img = document.createElement("img");
  img.className = "avatar";
  img.src = currentUser.photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  div.appendChild(bubble);
  div.appendChild(img);

  document.getElementById("messages").appendChild(div);
}

// =========================
async function loadMessages(){

  const res = await fetch(`/getMessages/${currentUser.id}`);
  const msgs = await res.json();

  let mudou = false;

  for (let m of msgs){
    if(m.toId === currentUser.id){
      if(!contacts.some(c => c.id === m.fromId)){
        const r = await fetch(`/getUser/${m.fromId}`);
        const user = await r.json();
        user.novo = true;
        contacts.push(user);
        mudou = true;
      }
    }
  }

  if(mudou){
    localStorage.setItem("contacts", JSON.stringify(contacts));
    renderContacts();
  }

  loadChatMessages();
}

// =========================
async function loadChatMessages(){
  if(!currentChatId) return;

  const res = await fetch(`/getMessages/${currentUser.id}`);
  const msgs = await res.json();

  const filtradas = msgs.filter(m =>
    (m.fromId === currentUser.id && m.toId === currentChatId) ||
    (m.fromId === currentChatId && m.toId === currentUser.id)
  );

  const container = document.getElementById("messages");

  for (let m of filtradas){

    if(lastMessageIds.has(m.id)) continue;
    lastMessageIds.add(m.id);

    const isMe = m.fromId === currentUser.id;

    const div = document.createElement("div");
    div.className = "message " + (isMe ? "me" : "other");

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = (isMe ? "Você: " : "") + m.text;

    const img = document.createElement("img");
    img.className = "avatar";

    const r = await fetch(`/getUser/${m.fromId}`);
    const user = await r.json();

    img.src = user.photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    if(isMe){
      div.appendChild(bubble);
      div.appendChild(img);
    } else {
      div.appendChild(img);
      div.appendChild(bubble);
    }

    container.appendChild(div);
  }

  container.scrollTop = container.scrollHeight;
}

// =========================
setInterval(loadMessages, 3000);
