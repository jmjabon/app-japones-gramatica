import { loadProgress, toggleBookmark, exportProgress, importProgress } from './storage.js';

let appState = loadProgress();
let grammarData = [];
// Variables para controlar el estado del ejercicio actual
let currentExercises = [];
let currentExIndex = 0;

const initUI = () => {
    lucide.createIcons();
    setupToggles();
    setupSettingsModal();
    loadGrammarData();
};

const setupToggles = () => {
    const body = document.body;
    ['toggle-furigana', 'toggle-romaji', 'toggle-es'].forEach(id => {
        document.getElementById(id).addEventListener('click', (e) => {
            const className = id.replace('toggle-', 'show-');
            body.classList.toggle(className);
            e.target.classList.toggle('opacity-50');
            e.target.classList.toggle('bg-gray-100');
            e.target.classList.toggle('border-gray-200');
            e.target.classList.toggle('text-gray-400');
        });
    });
};

const loadGrammarData = async () => {
    try {
        const response = await fetch('./data/grammar_n5.json');
        grammarData = await response.json();
        renderDashboard();
    } catch(e) {
        document.getElementById('app-view').innerHTML = '<p class="text-rose-500 font-bold mt-10 text-center">Error cargando la base de datos de gramática.</p>';
    }
};

const renderDashboard = () => {
    let html = '<div class="space-y-8 fade-in pt-4">';
    grammarData.forEach(block => {
        html += `
            <section>
                <h2 class="font-extrabold text-xl text-slate-900 mb-4 tracking-tight px-1">${block.block_title}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        `;
        
        block.themes.forEach(theme => {
            const isCompleted = appState.completed_themes.includes(theme.theme_id);
            const isLocked = theme.status === 'locked' && !isCompleted;
            const isBookmarked = appState.bookmarks.includes(theme.theme_id);
            
            html += `
                <div class="theme-card bg-white p-5 rounded-2xl border ${isLocked ? 'border-slate-100 opacity-60' : 'border-slate-200 hover:border-indigo-300 shadow-sm cursor-pointer active:scale-[0.98]'} transition-all relative overflow-hidden" data-id="${theme.theme_id}" data-locked="${isLocked}">
                    ${isBookmarked ? '<div class="absolute top-0 right-3 w-4 h-6 bg-amber-400 rounded-b-md shadow-sm"></div>' : ''}
                    <div class="flex justify-between items-start mb-1">
                        <h3 class="font-bold text-slate-800 flex items-center gap-2 text-lg">
                            ${isLocked ? '<i data-lucide="lock" class="w-5 h-5 text-slate-400"></i>' : '<i data-lucide="book-open" class="w-5 h-5 text-indigo-500"></i>'}
                            ${theme.theme_title}
                        </h3>
                        ${isCompleted ? '<span class="bg-emerald-100 text-emerald-700 p-1.5 rounded-full"><i data-lucide="check" class="w-4 h-4"></i></span>' : ''}
                    </div>
                    <p class="text-sm text-slate-500 mt-2">${isLocked ? 'Completa el tema anterior para desbloquear' : 'Pulsa para aprender la teoría'}</p>
                </div>
            `;
        });
        html += '</div></section>';
    });
    html += '</div>';
    
    document.getElementById('app-view').innerHTML = html;
    lucide.createIcons();

    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.currentTarget.dataset.locked === 'true') return;
            const themeId = e.currentTarget.dataset.id;
            const theme = grammarData.flatMap(b => b.themes).find(t => t.theme_id === themeId);
            renderGuideMode(theme);
        });
    });
};

// --- MODO GUÍA (TEORÍA VISUAL) ---
const renderGuideMode = (theme) => {
    const isBookmarked = appState.bookmarks.includes(theme.theme_id);
    
    let examplesHtml = theme.theory.examples.map(ex => `
        <div class="bg-white border border-slate-100 p-4 rounded-xl shadow-sm mb-3">
            <div class="text-2xl font-bold text-slate-800 mb-2 tracking-wide">${ex.ja}</div>
            <div class="romaji-text text-sm font-mono text-slate-500 mb-1">${ex.romaji}</div>
            <div class="es-text text-sm font-medium text-slate-700">${ex.es}</div>
        </div>
    `).join('');

    document.getElementById('app-view').innerHTML = `
        <div class="fade-in max-w-xl mx-auto w-full pt-4 pb-24 space-y-6">
            <header class="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                <button id="btn-back-dash" class="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"><i data-lucide="arrow-left" class="w-6 h-6"></i></button>
                <h2 class="font-bold text-slate-800 truncate px-4">${theme.theme_title}</h2>
                <button id="btn-bookmark" class="p-2 rounded-xl transition-colors ${isBookmarked ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:bg-slate-100'}">
                    <i data-lucide="pin" class="w-6 h-6 ${isBookmarked ? 'fill-current' : ''}"></i>
                </button>
            </header>

            <section class="bg-indigo-900 rounded-[2rem] p-6 md:p-8 shadow-lg text-center relative overflow-hidden">
                <div class="absolute -right-4 -top-4 opacity-10">
                    <i data-lucide="function-square" class="w-32 h-32 text-white"></i>
                </div>
                <h3 class="text-indigo-200 font-bold text-xs uppercase tracking-widest mb-4 relative z-10">Fórmula Estructural</h3>
                <!-- CORRECCIÓN DE CONTRASTE: Fondo blanco en lugar de semitransparente -->
                <div class="bg-white shadow-inner p-5 rounded-2xl text-xl md:text-2xl tracking-wide relative z-10">
                    ${theme.theory.formula}
                </div>
            </section>

            <section class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <h3 class="font-bold text-slate-800 mb-3 flex items-center gap-2"><i data-lucide="info" class="w-5 h-5 text-indigo-500"></i> Lógica Funcional</h3>
                <p class="text-slate-600 leading-relaxed">${theme.theory.explanation}</p>
            </section>

            <section>
                <h3 class="font-bold text-slate-800 mb-4 px-2">Ejemplos en Contexto</h3>
                ${examplesHtml}
            </section>

            <button id="btn-start-practice" class="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-md hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 mt-8">
                <i data-lucide="dumbbell" class="w-5 h-5"></i> Iniciar Práctica
            </button>
        </div>
    `;
    lucide.createIcons();

    document.getElementById('btn-back-dash').addEventListener('click', renderDashboard);
    
    document.getElementById('btn-bookmark').addEventListener('click', (e) => {
        appState.bookmarks = toggleBookmark(theme.theme_id);
        const btn = e.currentTarget;
        const icon = btn.querySelector('i');
        const isNowBookmarked = appState.bookmarks.includes(theme.theme_id);
        
        btn.className = `p-2 rounded-xl transition-colors ${isNowBookmarked ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:bg-slate-100'}`;
        if (isNowBookmarked) {
            icon.classList.add('fill-current');
        } else {
            icon.classList.remove('fill-current');
        }
    });

    document.getElementById('btn-start-practice').addEventListener('click', () => {
        if (!theme.exercises || theme.exercises.length === 0) {
            alert('Aún no hay ejercicios configurados para este tema.');
            return;
        }
        currentExercises = theme.exercises;
        currentExIndex = 0;
        renderExercise(theme);
    });
};

// --- MÓDULO DE PRÁCTICA (ANDAMIAJE) ---
const renderExercise = (theme) => {
    if (currentExIndex >= currentExercises.length) {
        alert("¡Práctica completada con éxito!");
        return renderGuideMode(theme); 
    }

    const ex = currentExercises[currentExIndex];

    if (ex.type === 'scramble') {
        renderScrambleExercise(theme, ex);
    } else if (ex.type === 'cloze') {
        renderClozeExercise(theme, ex);
    } else if (ex.type === 'classifier') {
        renderClassifierExercise(theme, ex);
    }
};

// --- MODO CLASIFICADOR RÁPIDO (TINDER GRAMATICAL) ---
const renderClassifierExercise = (theme, ex) => {
    let currentItemIndex = 0;
    
    const renderCurrentCard = () => {
        if (currentItemIndex >= ex.items.length) {
            currentExIndex++; // Pasa al siguiente tipo de ejercicio (si lo hay)
            return renderExercise(theme);
        }
        
        const item = ex.items[currentItemIndex];
        
        document.getElementById('app-view').innerHTML = `
            <div class="fade-in max-w-xl mx-auto w-full pt-4 pb-24 flex flex-col h-[85vh]">
                <header class="flex items-center justify-between mb-8 px-2">
                    <button id="btn-quit-ex" class="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full shadow-sm"><i data-lucide="x"></i></button>
                    <span class="text-xs font-bold text-pink-600 bg-pink-50 px-3 py-1 rounded-full uppercase tracking-wider">Clasificador Rápido</span>
                    <span class="text-xs font-mono font-bold text-slate-400">${currentItemIndex + 1}/${ex.items.length}</span>
                </header>

                <div class="text-center mb-8 flex-grow flex flex-col justify-center">
                    <p class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">${ex.instruction}</p>
                    <div id="flashcard" class="bg-white py-16 px-6 rounded-[2rem] shadow-sm border-2 border-slate-200 text-3xl md:text-4xl font-extrabold text-slate-800 transition-colors duration-300">
                        ${item.word}
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-auto mb-8">
                    ${ex.categories.map(cat => `
                        <button class="cat-btn bg-white border-2 border-slate-200 py-4 rounded-2xl text-sm md:text-base font-bold text-slate-700 shadow-sm hover:border-indigo-400 active:scale-95 transition-all" data-cat="${cat}">
                            ${cat}
                        </button>
                    `).join('')}
                </div>

                <!-- Panel de Error (Oculto) -->
                <div id="error-panel" class="fixed bottom-0 left-0 w-full bg-rose-50 border-t-2 border-rose-500 p-6 transform translate-y-full transition-transform duration-300 shadow-2xl z-50 rounded-t-3xl max-w-3xl mx-auto right-0">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="font-bold text-rose-800 text-lg flex items-center gap-2"><i data-lucide="alert-circle" class="w-5 h-5"></i> Grupo Incorrecto</h3>
                            <p id="error-reason" class="text-rose-700 text-sm mt-2 font-medium leading-relaxed"></p>
                        </div>
                        <button id="btn-close-error" class="p-2 bg-rose-100 text-rose-500 rounded-full hover:bg-rose-200"><i data-lucide="x" class="w-5 h-5"></i></button>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();

        document.getElementById('btn-quit-ex').addEventListener('click', () => renderGuideMode(theme));
        const errorPanel = document.getElementById('error-panel');
        const flashcard = document.getElementById('flashcard');
        
        document.getElementById('btn-close-error').addEventListener('click', () => {
            errorPanel.classList.add('translate-y-full');
        });

        // Lógica de los botones de clasificación
        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // Si el panel de error está visible, bloqueamos el intento hasta que lo cierre
                if (!errorPanel.classList.contains('translate-y-full')) return;

                const selectedCat = this.dataset.cat;
                
                if (selectedCat === item.expected) {
                    // Correcto: Brillo verde y pasa al siguiente
                    flashcard.classList.replace('border-slate-200', 'border-emerald-500');
                    flashcard.classList.add('bg-emerald-50', 'text-emerald-700');
                    
                    setTimeout(() => {
                        currentItemIndex++;
                        renderCurrentCard(); 
                    }, 600);
                } else {
                    // Incorrecto: Temblor, rojo y explicación
                    flashcard.classList.add('animate-shake', 'border-rose-500', 'bg-rose-50');
                    setTimeout(() => {
                        flashcard.classList.remove('animate-shake', 'border-rose-500', 'bg-rose-50');
                    }, 300);
                    
                    document.getElementById('error-reason').textContent = item.rule;
                    errorPanel.classList.remove('translate-y-full');
                }
            });
        });
    };
    
    renderCurrentCard();
};

const renderScrambleExercise = (theme, ex) => {
    // Preparar fichas: esperadas + distractores, barajadas
    let tiles = [...ex.expected];
    if (ex.distractors) tiles = tiles.concat(ex.distractors);
    tiles.sort(() => Math.random() - 0.5);

    document.getElementById('app-view').innerHTML = `
        <div class="fade-in max-w-xl mx-auto w-full pt-4 pb-24 flex flex-col h-[85vh]">
            
            <header class="flex items-center justify-between mb-8 px-2">
                <button id="btn-quit-ex" class="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full shadow-sm"><i data-lucide="x"></i></button>
                <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">Paso 1: Puzzle Estructural</span>
                <span class="text-xs font-mono font-bold text-slate-400">${currentExIndex + 1}/${currentExercises.length}</span>
            </header>

            <div class="text-center mb-8 flex-grow">
                <p class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Traduce al Japonés</p>
                <h2 class="text-2xl font-bold text-slate-800">${ex.es}</h2>
            </div>

            <!-- Zona de construcción -->
            <div id="drop-zone" class="min-h-[80px] bg-white border-2 border-dashed border-slate-300 rounded-2xl p-4 mb-6 flex flex-wrap gap-2 items-center justify-center">
                <!-- Las fichas seleccionadas irán aquí -->
            </div>

            <!-- Fichas disponibles -->
            <div id="tile-bank" class="flex flex-wrap gap-2 justify-center mb-8">
                ${tiles.map((tile, i) => `
                    <button class="scramble-tile bg-white border border-slate-200 shadow-sm rounded-xl py-3 px-5 text-xl font-bold text-slate-800 active:scale-95 transition-transform" data-word="${tile}">
                        ${tile}
                    </button>
                `).join('')}
            </div>

            <button id="btn-check-ex" class="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-md hover:bg-slate-800 active:scale-95 transition-all opacity-50 pointer-events-none">
                Comprobar
            </button>
            
            <!-- Panel flotante de error (oculto por defecto) -->
            <div id="error-panel" class="fixed bottom-0 left-0 w-full bg-rose-50 border-t-2 border-rose-500 p-6 transform translate-y-full transition-transform duration-300 shadow-2xl z-50 rounded-t-3xl max-w-3xl mx-auto right-0">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-bold text-rose-800 text-lg flex items-center gap-2"><i data-lucide="alert-circle" class="w-5 h-5"></i> Orden incorrecto</h3>
                        <p class="text-rose-600 text-sm mt-1">Recuerda el orden Estricto: Sujeto は Objeto Verbo</p>
                    </div>
                    <button id="btn-close-error" class="p-2 bg-rose-100 text-rose-500 rounded-full hover:bg-rose-200"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();

    document.getElementById('btn-quit-ex').addEventListener('click', () => renderGuideMode(theme));
    
    const dropZone = document.getElementById('drop-zone');
    const tileBank = document.getElementById('tile-bank');
    const btnCheck = document.getElementById('btn-check-ex');
    const errorPanel = document.getElementById('error-panel');

    // Lógica de mover fichas
    document.querySelectorAll('.scramble-tile').forEach(tile => {
        tile.addEventListener('click', function() {
            if (this.parentElement === tileBank) {
                dropZone.appendChild(this);
            } else {
                tileBank.appendChild(this);
            }
            
            // Habilitar botón comprobar si hay fichas en dropZone
            if (dropZone.children.length > 0) {
                btnCheck.classList.remove('opacity-50', 'pointer-events-none');
            } else {
                btnCheck.classList.add('opacity-50', 'pointer-events-none');
            }
        });
    });

    document.getElementById('btn-close-error').addEventListener('click', () => {
        errorPanel.classList.add('translate-y-full');
    });

    btnCheck.addEventListener('click', () => {
        // Recopilar respuesta actual
        const currentAnswer = Array.from(dropZone.children).map(t => t.dataset.word).join('');
        const expectedAnswer = ex.expected.join('');

        if (currentAnswer === expectedAnswer) {
            btnCheck.classList.remove('bg-slate-900', 'hover:bg-slate-800');
            btnCheck.classList.add('bg-emerald-500', 'hover:bg-emerald-600');
            btnCheck.innerHTML = '<i data-lucide="check-circle" class="w-6 h-6 inline mr-2"></i> ¡Correcto!';
            lucide.createIcons();
            
            setTimeout(() => {
                currentExIndex++;
                renderExercise(theme);
            }, 1200);
        } else {
            errorPanel.classList.remove('translate-y-full');
            // Devolver las fichas incorrectas al banco para forzar a pensar (castigo leve)
            while (dropZone.firstChild) {
                tileBank.appendChild(dropZone.firstChild);
            }
            btnCheck.classList.add('opacity-50', 'pointer-events-none');
        }
    });
};

const renderClozeExercise = (theme, ex) => {
    // Barajar opciones
    let options = [ex.expected, ...ex.distractors].sort(() => Math.random() - 0.5);

    // Preparar el texto con el hueco
    const jaText = ex.ja_template.replace('[?]', `<span class="inline-block min-w-[3rem] border-b-2 border-dashed border-indigo-300 mx-1 px-2 text-center text-indigo-500 font-bold bg-indigo-50/50 rounded-t">___</span>`);

    document.getElementById('app-view').innerHTML = `
        <div class="fade-in max-w-xl mx-auto w-full pt-4 pb-24 flex flex-col h-[85vh]">
            
            <header class="flex items-center justify-between mb-8 px-2">
                <button id="btn-quit-ex" class="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full shadow-sm"><i data-lucide="x"></i></button>
                <span class="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-wider">Paso 3: Hueco Crítico</span>
                <span class="text-xs font-mono font-bold text-slate-400">${currentExIndex + 1}/${currentExercises.length}</span>
            </header>

            <div class="text-center mb-8">
                <p class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Completa la Partícula</p>
                <h2 class="es-text text-lg font-medium text-slate-600 mb-6">${ex.es}</h2>
                <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-3xl leading-relaxed">
                    ${jaText}
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-auto mb-8" id="cloze-options">
                ${options.map(opt => `
                    <button class="cloze-btn bg-white border-2 border-slate-200 py-6 rounded-2xl text-2xl font-bold text-slate-800 shadow-sm hover:border-indigo-400 active:scale-95 transition-all" data-ans="${opt}">
                        ${opt}
                    </button>
                `).join('')}
            </div>
            
            <!-- Panel flotante de error -->
            <div id="error-panel" class="fixed bottom-0 left-0 w-full bg-rose-50 border-t-2 border-rose-500 p-6 transform translate-y-full transition-transform duration-300 shadow-2xl z-50 rounded-t-3xl max-w-3xl mx-auto right-0">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-bold text-rose-800 text-lg flex items-center gap-2"><i data-lucide="alert-circle" class="w-5 h-5"></i> Partícula Incorrecta</h3>
                        <p class="text-rose-600 text-sm mt-1">Aunque la frase sea negativa (dewa arimasen), el tema de la frase se sigue marcando con 'wa' (は).</p>
                    </div>
                    <button id="btn-close-error" class="p-2 bg-rose-100 text-rose-500 rounded-full hover:bg-rose-200"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();

    document.getElementById('btn-quit-ex').addEventListener('click', () => renderGuideMode(theme));
    const errorPanel = document.getElementById('error-panel');
    
    document.getElementById('btn-close-error').addEventListener('click', () => {
        errorPanel.classList.add('translate-y-full');
    });

    const clozeBtns = document.querySelectorAll('.cloze-btn');
    clozeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            clozeBtns.forEach(b => b.disabled = true);
            
            if (this.dataset.ans === ex.expected) {
                this.classList.replace('border-slate-200', 'border-emerald-500');
                this.classList.add('bg-emerald-50', 'text-emerald-700');
                
                setTimeout(() => {
                    currentExIndex++;
                    renderExercise(theme);
                }, 1000);
            } else {
                this.classList.replace('border-slate-200', 'border-rose-500');
                this.classList.add('bg-rose-50', 'text-rose-700');
                errorPanel.classList.remove('translate-y-full');
                
                // Marcar la correcta
                const correctBtn = Array.from(clozeBtns).find(b => b.dataset.ans === ex.expected);
                correctBtn.classList.replace('border-slate-200', 'border-emerald-500');
                correctBtn.classList.add('bg-emerald-50');
                
                // Permitir reintentar reseteando estado después de ver el error
                setTimeout(() => {
                    clozeBtns.forEach(b => {
                        b.disabled = false;
                        b.className = "cloze-btn bg-white border-2 border-slate-200 py-6 rounded-2xl text-2xl font-bold text-slate-800 shadow-sm hover:border-indigo-400 active:scale-95 transition-all";
                    });
                }, 2500); // Dar tiempo a leer el error antes de resetear
            }
        });
    });
};

// --- MODAL DE AJUSTES ---
const setupSettingsModal = () => {
    document.getElementById('btn-settings').addEventListener('click', () => {
        if (document.getElementById('settings-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'settings-modal';
        modal.className = 'fixed inset-0 z-[100] flex items-end md:items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300';
        
        modal.innerHTML = `
            <div id="settings-overlay" class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
            <div id="settings-sheet" class="relative w-full md:w-[400px] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl transform translate-y-full md:translate-y-4 md:scale-95 transition-all duration-300 p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold text-slate-900">Ajustes y Datos</h2>
                    <button id="btn-close-settings" class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><i data-lucide="x" class="w-4 h-4"></i></button>
                </div>
                <div class="space-y-3">
                    <button id="btn-modal-export" class="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl flex items-center gap-4 hover:border-indigo-200 active:scale-95 transition-all">
                        <i data-lucide="download" class="text-indigo-600"></i>
                        <div class="text-left"><p class="font-bold text-slate-800">Exportar Progreso</p><p class="text-xs text-slate-500">Guardar JSON local</p></div>
                    </button>
                    <button id="btn-modal-import" class="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl flex items-center gap-4 hover:border-emerald-200 active:scale-95 transition-all">
                        <i data-lucide="upload" class="text-emerald-600"></i>
                        <div class="text-left"><p class="font-bold text-slate-800">Restaurar Datos</p><p class="text-xs text-slate-500">Cargar JSON de respaldo</p></div>
                    </button>
                    <input type="file" id="file-import-hidden" accept=".json" class="hidden" />
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        lucide.createIcons();

        const sheet = document.getElementById('settings-sheet');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0', 'pointer-events-none');
            sheet.classList.remove('translate-y-full', 'md:translate-y-4', 'md:scale-95');
        });

        const closeModal = () => {
            sheet.classList.add('translate-y-full', 'md:translate-y-4', 'md:scale-95');
            modal.classList.add('opacity-0');
            setTimeout(() => modal.remove(), 300);
        };

        document.getElementById('btn-close-settings').addEventListener('click', closeModal);
        document.getElementById('settings-overlay').addEventListener('click', closeModal);
        
        document.getElementById('btn-modal-export').addEventListener('click', () => {
            exportProgress();
            closeModal();
        });
        
        document.getElementById('btn-modal-import').addEventListener('click', () => document.getElementById('file-import-hidden').click());
        document.getElementById('file-import-hidden').addEventListener('change', (e) => {
            if(e.target.files[0]) {
                if (confirm('¿Sobrescribir tu progreso actual?')) {
                    importProgress(e.target.files[0], () => location.reload());
                }
            }
        });
    });
};

document.addEventListener('DOMContentLoaded', initUI);