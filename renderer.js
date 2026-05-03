const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

let userDataPath, audioDir, jsonPath, data;
let isRunning = false;
let terakhirBunyi = "";
let hEdit = null, iEdit = null;

function initSistem() {
    try {
        userDataPath = ipcRenderer.sendSync('get-path');
        audioDir = path.join(userDataPath, "audio");
        jsonPath = path.join(userDataPath, 'jadwal.json');
        if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
        const daftarHari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
        if (!fs.existsSync(jsonPath)) {
            const initial = {};
            daftarHari.forEach(h => initial[h] = []);
            fs.writeFileSync(jsonPath, JSON.stringify(initial, null, 2));
        }
        data = JSON.parse(fs.readFileSync(jsonPath));
        daftarHari.forEach(h => { if (!data[h]) data[h] = []; });
        tampilkan();
    } catch (e) { console.error(e); }
}

function simpanKeFile() {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    tampilkan();
}

// Modal Handlers
function bukaModalTambah() { document.getElementById('modalTambah').style.display = "flex"; }
function tutupModal(id) { document.getElementById(id).style.display = "none"; }

async function simpanJadwalBaru() {
    const hari = document.getElementById('hari').value;
    const jam = document.getElementById('jam').value;
    const judul = document.getElementById('judul').value;
    const f = document.getElementById('fileAudio').files[0];

    if (!jam || !judul) return alert("Isi jam dan nama kegiatan!");

    let aName = "default.mp3";
    if (f) {
        aName = Date.now() + "_" + f.name;
        fs.writeFileSync(path.join(audioDir, aName), Buffer.from(await f.arrayBuffer()));
    }

    data[hari].push({ jam, judul, audio: aName });
    data[hari].sort((a, b) => a.jam.localeCompare(b.jam));

    simpanKeFile();

    // --- RESET FORM ---
    document.getElementById('jam').value = "";
    document.getElementById('judul').value = "";
    document.getElementById('fileAudio').value = "";

    tutupModal('modalTambah');
}

function hapus(h, i) { if (confirm("Hapus jadwal?")) { data[h].splice(i, 1); simpanKeFile(); } }

function bukaEdit(h, i) {
    hEdit = h; iEdit = i;
    const item = data[h][i];
    document.getElementById('editHari').value = h;
    document.getElementById('editJam').value = item.jam;
    document.getElementById('editJudul').value = item.judul;
    document.getElementById('modalEdit').style.display = "flex";
}

function simpanEdit() {
    const hBaru = document.getElementById('editHari').value;
    const aOld = data[hEdit][iEdit].audio;
    data[hEdit].splice(iEdit, 1);
    data[hBaru].push({ jam: document.getElementById('editJam').value, judul: document.getElementById('editJudul').value, audio: aOld });
    data[hBaru].sort((a, b) => a.jam.localeCompare(b.jam));
    simpanKeFile();
    tutupModal('modalEdit');
}

function testAudio(n) { const p = path.join(audioDir, n); if (fs.existsSync(p)) new Audio(p).play(); }

function tampilkan() {
    const container = document.getElementById('list');
    container.innerHTML = "";
    Object.keys(data).forEach(h => {
        if (data[h].length === 0) return;
        const g = document.createElement('div'); g.className = "day-group";
        g.innerHTML = `<div class="day-title">${h}</div>`;
        data[h].forEach((it, i) => {
            const el = document.createElement('div'); el.className = "item";
            el.innerHTML = `<div class="item-info"><b>${it.jam}</b><span>${it.judul}</span></div>
                            <div class="action-btns">
                                <button style="background:var(--warning)" onclick="bukaEdit('${h}',${i})">EDIT</button>
                                <button style="background:var(--accent)" onclick="testAudio('${it.audio}')">TEST</button>
                                <button style="background:var(--danger)" onclick="hapus('${h}',${i})">HAPUS</button>
                            </div>`;
            g.appendChild(el);
        });
        container.appendChild(g);
    });
}

window.runApp = () => { isRunning = true; const s = document.getElementById("status"); s.innerText = "RUNNING"; s.className = "status-tag status-on"; ipcRenderer.send('start-clock'); };
window.stopApp = () => { isRunning = false; const s = document.getElementById("status"); s.innerText = "OFF"; s.className = "status-tag status-off"; ipcRenderer.send('stop-clock'); };

setInterval(() => {
    if (!isRunning) return;
    const now = new Date();
    const hL = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const hS = hL[now.getDay()], jS = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    if (data[hS]) data[hS].forEach(it => { if (it.jam === jS && terakhirBunyi !== jS) { testAudio(it.audio); terakhirBunyi = jS; } });
}, 1000);

initSistem();