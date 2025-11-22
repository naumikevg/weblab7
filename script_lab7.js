document.addEventListener("DOMContentLoaded", () => {
    const work = document.getElementById('work');
    const anim = document.getElementById('anim');
    const btnPlay = document.getElementById('btnPlay');
    const btnClose = document.getElementById('btnClose');
    const btnAction = document.getElementById('btnAction'); 
    const logDisplay = document.getElementById('logDisplay');
    const reportArea = document.getElementById('reportArea');

    let animationId = null;
    let eventCounter = 0;
    let state = 'start'; 

    let c1 = { el: null, x: 0, y: 0, dx: 3, dy: 4, r: 10, color: 'red' };
    let c2 = { el: null, x: 0, y: 0, dx: -4, dy: 3, r: 10, color: 'green' };

    btnPlay.addEventListener('click', () => {
        work.style.display = 'flex';
        initCircles();
        fetch('server.php', { method: 'POST', body: JSON.stringify({ type: 'clear' }) });
        localStorage.setItem('lab7_events', JSON.stringify([]));
        eventCounter = 0;
        reportArea.innerHTML = '';
    });

    btnClose.addEventListener('click', () => {
        stopAnimation();
        work.style.display = 'none';
        
        const allEvents = JSON.parse(localStorage.getItem('lab7_events') || '[]');
        
        logDisplay.textContent = "Збереження даних...";
        
        fetch('server.php', {
            method: 'POST',
            body: JSON.stringify({ type: 'batch', payload: allEvents })
        }).then(() => {
            buildReport();
        });
    });

    btnAction.addEventListener('click', () => {
        logEvent(`Button: ${state}`);

        if (state === 'start') {
            startAnimation();
            btnAction.textContent = 'STOP';
            state = 'stop';
        } else if (state === 'stop') {
            stopAnimation();
            btnAction.textContent = 'START';
            state = 'start';
        } else if (state === 'reload') {
            initCircles();
            btnAction.textContent = 'START';
            state = 'start';
        }
    });

    function initCircles() {
        anim.innerHTML = '';
        
        c1.el = createCircle(c1.color);
        c2.el = createCircle(c2.color);

        c1.x = 2; 
        c1.y = Math.random() * (anim.clientHeight - 30);
        
        c2.x = Math.random() * (anim.clientWidth - 30);
        c2.y = 2;

        updateView(c1);
        updateView(c2);
    }

    function createCircle(color) {
        let div = document.createElement('div');
        div.className = 'circle';
        div.style.backgroundColor = color;
        anim.appendChild(div);
        return div;
    }

    function updateView(c) {
        c.el.style.left = c.x + 'px';
        c.el.style.top = c.y + 'px';
    }

    function startAnimation() {
        if (animationId) return;
        animationId = setInterval(frame, 20); 
    }

    function stopAnimation() {
        clearInterval(animationId);
        animationId = null;
    }

    function frame() {
        move(c1);
        move(c2);
        
        let dx = c1.x - c2.x;
        let dy = c1.y - c2.y;
        let dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 20) { 
            stopAnimation();
            logEvent("Collision detected!");
            btnAction.textContent = "RELOAD";
            state = 'reload';
            alert("Зіткнення! Анімацію зупинено.");
        }

        logEvent("step");
    }

    function move(c) {
        let nx = c.x + c.dx;
        let ny = c.y + c.dy;
        let w = anim.clientWidth - 20;
        let h = anim.clientHeight - 20;
        let hit = false;

        if (nx <= 0 || nx >= w) { c.dx = -c.dx; hit = true; }
        if (ny <= 0 || ny >= h) { c.dy = -c.dy; hit = true; }

        c.x += c.dx;
        c.y += c.dy;
        updateView(c);

        if (hit) logEvent(`Wall hit: ${c.color}`);
    }

    function logEvent(msg) {
        eventCounter++;
        const now = Date.now();
        const data = { id: eventCounter, message: msg, time: now };

        logDisplay.textContent = `#${eventCounter} ${msg}`;

        
        fetch('server.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ type: 'immediate', ...data })
        }).catch(e => console.log("Lag"));

        let ls = JSON.parse(localStorage.getItem('lab7_events') || '[]');
        ls.push(data);
        localStorage.setItem('lab7_events', JSON.stringify(ls));
    }

    function buildReport() {
        fetch('server.php')
        .then(r => r.json())
        .then(d => {
            let imm = d.immediate || [];
            let bat = d.batch || [];
            
            let html = `<h3>Звіт (Подій: ${bat.length})</h3>`;
            html += `<table class="report-table">
                <tr>
                    <th>ID</th><th>Подія</th>
                    <th>Час JS</th>
                    <th>Час Сервера (Спосіб 1)</th>
                    <th>Час Сервера (Спосіб 2)</th>
                    <th>Різниця (мс)</th>
                </tr>`;

            let limit = Math.min(bat.length, 200); 
            
            for(let i=0; i < limit; i++) {
                let bRow = bat[i];
                let iRow = imm.find(x => x.id === bRow.id) || {};
                
                let t1 = iRow.server_time ? iRow.server_time.toFixed(0) : "Втрачено";
                let t2 = bRow.server_save_time ? bRow.server_save_time.toFixed(0) : "-";
                
                let diff = (iRow.server_time && bRow.server_save_time) 
                           ? (bRow.server_save_time - iRow.server_time).toFixed(0) 
                           : "-";
                
                let colorClass = (diff > 1000) ? 'diff-high' : '';

                html += `<tr>
                    <td>${bRow.id}</td>
                    <td>${bRow.message}</td>
                    <td>${bRow.time}</td>
                    <td>${t1}</td>
                    <td>${t2}</td>
                    <td class="${colorClass}">${diff}</td>
                </tr>`;
            }
            html += `</table>`;
            
            if (imm.length < bat.length) {
                html += `<p style="color:red; font-weight:bold;">Увага! Втрачено ${bat.length - imm.length} подій через перевантаження (Спосіб 1)!</p>`;
            }

            reportArea.innerHTML = html;
        });
    }
});