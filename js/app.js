import { loadProgress, toggleBookmark, exportProgress, importProgress, saveProgress } from './storage.js';

let appState = loadProgress();
let grammarData = [];
// Variables de estado del ejercicio
let currentExercises = [];
let currentExIndex = 0;
let errorsInCurrentTheme = 0; // Para exigir el 100%

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
    
    // Bandera para saber si el bloque anterior fue superado por completo (Examen incluido)
    let isPreviousBlockCleared = true; 

    grammarData.forEach(block => {
        html += `
            <section>
                <h2 class="font-extrabold text-xl text-slate-900 mb-4 tracking-tight px-1 ${!isPreviousBlockCleared ? 'opacity-40' : ''}">${block.block_title}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        `;
        
        // Variables para controlar el progreso interno del bloque
        const normalThemes = block.themes.filter(t => t.type !== 'checkpoint');
        const completedNormalThemesCount = normalThemes.filter(t => appState.completed_themes.includes(t.theme_id)).length;
        
        let previousThemeCompleted = true; // El primer tema del bloque activo siempre está desbloqueado

        block.themes.forEach((theme, index) => {
            const isCompleted = appState.completed_themes.includes(theme.theme_id);
            const isBookmarked = appState.bookmarks.includes(theme.theme_id);
            const isCheckpoint = theme.type === 'checkpoint';
            
            // LÓGICA DE BLOQUEO DINÁMICA:
            let isLocked = true;
            
            if (!isPreviousBlockCleared) {
                // Si no has pasado el bloque anterior, todo este bloque está cerrado
                isLocked = true;
            } else if (isCheckpoint) {
                // El Checkpoint SOLO se abre si TODOS los temas normales del bloque están completados
                isLocked = completedNormalThemesCount < normalThemes.length;
            } else {
                // Un tema normal se abre si el tema Inmediatamente Anterior está completado
                isLocked = !previousThemeCompleted;
            }

            if (isCheckpoint) {
                // Diseño especial para el Checkpoint
                html += `
                    <div class="theme-card md:col-span-2 p-5 rounded-2xl border-2 ${isLocked ? 'border-slate-200 bg-slate-50 opacity-50' : 'border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 shadow-md hover:shadow-lg cursor-pointer'} transition-all flex items-center justify-between" data-id="${theme.theme_id}" data-locked="${isLocked}">
                        <div>
                            <h3 class="font-bold ${isLocked ? 'text-slate-500' : 'text-amber-700'} flex items-center gap-2 text-lg">
                                ${isLocked ? '<i data-lucide="lock" class="w-6 h-6"></i>' : '<i data-lucide="award" class="w-6 h-6"></i>'}
                                ${theme.theme_title}
                            </h3>
                            <p class="text-xs ${isLocked ? 'text-slate-400' : 'text-amber-600'} mt-1 uppercase font-bold tracking-wider">${isLocked ? 'Completa los temas anteriores' : 'Supera con 100% para avanzar'}</p>
                        </div>
                        ${isCompleted ? '<span class="bg-amber-400 text-white p-2 rounded-full shadow-sm"><i data-lucide="check-check" class="w-5 h-5"></i></span>' : ''}
                    </div>
                `;
                // Actualizar bandera global para el siguiente iterador de bloque
                isPreviousBlockCleared = isCompleted; 
            } else {
                // Diseño normal de tema
                html += `
                    <div class="theme-card bg-white p-5 rounded-2xl border ${isLocked ? 'border-slate-100 bg-slate-50 opacity-50' : 'border-slate-200 hover:border-indigo-300 shadow-sm cursor-pointer active:scale-[0.98]'} transition-all relative overflow-hidden" data-id="${theme.theme_id}" data-locked="${isLocked}">
                        ${isBookmarked ? '<div class="absolute top-0 right-3 w-4 h-6 bg-amber-400 rounded-b-md shadow-sm"></div>' : ''}
                        <div class="flex justify-between items-start mb-1">
                            <h3 class="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                ${isLocked ? '<i data-lucide="lock" class="w-5 h-5 text-slate-400"></i>' : '<i data-lucide="book-open" class="w-5 h-5 text-indigo-500"></i>'}
                                ${theme.theme_title}
                            </h3>
                            ${isCompleted ? '<span class="bg-emerald-100 text-emerald-700 p-1.5 rounded-full"><i data-lucide="check" class="w-4 h-4"></i></span>' : ''}
                        </div>
                        <p class="text-sm text-slate-500 mt-2">${isLocked ? 'Bloqueado' : 'Pulsa para aprender la teoría'}</p>
                    </div>
                `;
                // El estado de este tema dicta si el siguiente se abre
                previousThemeCompleted = isCompleted;
            }
        });
        html += '</div></section>';
    });
    html += '</div>';
    
    document.getElementById('app-view').innerHTML = html;
    lucide.createIcons();

    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.currentTarget.dataset.locked === 'true') {
                alert("Debes completar el contenido anterior primero.");
                return;
            }
            const themeId = e.currentTarget.dataset.id;
            const theme = grammarData.flatMap(b => b.themes).find(t => t.theme_id === themeId);
            
            if (theme.type === 'checkpoint') {
                startPractice(theme, theme.items);
            } else {
                renderGuideMode(theme);
            }
        });
    });
};

const startPractice = (theme, exercisesArray) => {
    if (!exercisesArray || exercisesArray.length === 0) {
        alert('Aún no hay ejercicios configurados.');
        return;
    }
    currentExercises = exercisesArray;
    currentExIndex = 0;
    errorsInCurrentTheme = 0;
    renderExercise(theme);
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
        if (isNowBookmarked) icon.classList.add('fill-current');
        else icon.classList.remove('fill-current');
    });

    document.getElementById('btn-start-practice').addEventListener('click', () => {
        startPractice(theme, theme.exercises);
    });
};

// --- MÓDULO DE PRÁCTICA (ENRUTADOR) ---
const renderExercise = (theme) => {
    if (currentExIndex >= currentExercises.length) {
        return handleCompletion(theme);
    }

    const ex = currentExercises[currentExIndex];

    if (ex.type === 'scramble') renderScrambleExercise(theme, ex);
    else if (ex.type === 'cloze') renderClozeExercise(theme, ex);
    else if (ex.type === 'classifier') renderClassifierExercise(theme, ex);
    else if (ex.type === 'reading_comprehension') renderReadingComprehension(theme, ex);
};

// Lógica de guardado al terminar un tema o checkpoint
const handleCompletion = (theme) => {
    const isCheckpoint = theme.type === 'checkpoint';
    
    if (errorsInCurrentTheme > 0) {
        alert(`Has cometido ${errorsInCurrentTheme} errores. Debes conseguir el 100% de aciertos.`);
        if (isCheckpoint) return renderDashboard(); 
        else { currentExIndex = 0; errorsInCurrentTheme = 0; return renderExercise(theme); } 
    }

    // Victoria 100%
    if (!appState.completed_themes.includes(theme.theme_id)) {
        appState.completed_themes.push(theme.theme_id);
    }
    
    saveProgress(appState);

    if (isCheckpoint) {
        alert("¡EXAMEN SUPERADO! Has desbloqueado el siguiente bloque gramatical.");
    } else {
        alert("¡Práctica completada con éxito!");
    }
    
    // Forzar redibujado con los bloqueos calculados de nuevo
    renderDashboard();
};


// --- EJERCICIO: COMPRENSIÓN LECTORA ---
const renderReadingComprehension = (theme, ex) => {
    let currentQuestionIndex = 0;
    
    const renderSubQuestion = () => {
        if (currentQuestionIndex >= ex.questions.length) {
            currentExIndex++;
            return renderExercise(theme);
        }
        
        const q = ex.questions[currentQuestionIndex];
        
        document.getElementById('app-view').innerHTML = `
            <div class="fade-in max-w-xl mx-auto w-full pt-4 pb-24 flex flex-col h-[90vh]">
                
                <header class="flex items-center justify-between mb-4 px-2">
                    <button id="btn-quit-ex" class="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full shadow-sm"><i data-lucide="x"></i></button>
                    <span class="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full uppercase tracking-wider">Lectura Comprensiva</span>
                    <span class="text-xs font-mono font-bold text-slate-400">${currentExIndex + 1}/${currentExercises.length}</span>
                </header>

                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 relative">
                    <span class="absolute -top-3 -right-3 bg-purple-500 text-white w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-md"><i data-lucide="book-open" class="w-4 h-4"></i></span>
                    <p class="text-lg leading-loose text-slate-800 font-medium whitespace-pre-wrap">${ex.ja_text}</p>
                </div>

                <div class="mb-4">
                    <p class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Pregunta ${currentQuestionIndex + 1}/${ex.questions.length}</p>
                    <h2 class="text-xl font-bold text-slate-900">${q.question}</h2>
                </div>

                <div class="space-y-3 mt-auto mb-8" id="rc-options">
                    ${q.options.map(opt => `
                        <button class="rc-btn w-full bg-white border-2 border-slate-200 p-4 rounded-xl text-left font-bold text-slate-700 shadow-sm hover:border-indigo-400 active:scale-95 transition-all" data-ans="${opt}">
                            ${opt}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        lucide.createIcons();
        document.getElementById('btn-quit-ex').addEventListener('click', renderDashboard);

        const rcBtns = document.querySelectorAll('.rc-btn');
        rcBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                rcBtns.forEach(b => b.disabled = true);
                
                if (this.dataset.ans === q.expected) {
                    this.classList.replace('border-slate-200', 'border-emerald-500');
                    this.classList.add('bg-emerald-50', 'text-emerald-700');
                    
                    setTimeout(() => {
                        currentQuestionIndex++;
                        renderSubQuestion();
                    }, 800);
                } else {
                    this.classList.replace('border-slate-200', 'border-rose-500');
                    this.classList.add('bg-rose-50', 'text-rose-700');
                    errorsInCurrentTheme++; // Falla el Checkpoint
                    
                    const correctBtn = Array.from(rcBtns).find(b => b.dataset.ans === q.expected);
                    correctBtn.classList.replace('border-slate-200', 'border-emerald-500');
                    correctBtn.classList.add('bg-emerald-50');
                    
                    setTimeout(() => {
                        currentQuestionIndex++;
                        renderSubQuestion();
                    }, 2000);
                }
            });
        });
    };
    
    renderSubQuestion();
};

const renderScrambleExercise = (theme, ex) => {
    let tiles = [...ex.expected];
    if (ex.distractors) tiles = tiles.concat(ex.distractors);
    tiles.sort(() => Math.random() - 0.5);

    document.getElementById('app-view').innerHTML = `
        <div class="fade-in max-w-xl mx-auto w-full pt-4 pb-24 flex flex-col h-[85vh]">
            <header class="flex items-center justify-between mb-8 px-2">
                <button id="btn-quit-ex" class="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full shadow-sm"><i data-lucide="x"></i></button>
                <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">Puzzle Estructural</span>
                <span class="text-xs font-mono font-bold text-slate-400">${currentExIndex + 1}/${currentExercises.length}</span>
            </header>

            <div class="text-center mb-8 flex-grow">
                <p class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Traduce al Japonés</p>
                <h2 class="text-2xl font-bold text-slate-800">${ex.es}</h2>
            </div>

            <div id="drop-zone" class="min-h-[80px] bg-white border-2 border-dashed border-slate-300 rounded-2xl p-4 mb-6 flex flex-wrap gap-2 items-center justify-center"></div>

            <div id="tile-bank" class="flex flex-wrap gap-2 justify-center mb-8">
                ${tiles.map(tile => `
                    <button class="scramble-tile bg-white border border-slate-200 shadow-sm rounded-xl py-3 px-5 text-xl font-bold text-slate-800 active:scale-95 transition-transform" data-word="${tile}">${tile}</button>
                `).join('')}
            </div>

            <button id="btn-check-ex" class="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-md hover:bg-slate-800 active:scale-95 transition-all opacity-50 pointer-events-none">Comprobar</button>
            
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

    document.getElementById('btn-quit-ex').addEventListener('click', () => {
        theme.type === 'checkpoint' ? renderDashboard() : renderGuideMode(theme);
    });
    
    const dropZone = document.getElementById('drop-zone');
    const tileBank = document.getElementById('tile-bank');
    const btnCheck = document.getElementById('btn-check-ex');
    const errorPanel = document.getElementById('error-panel');

    document.querySelectorAll('.scramble-tile').forEach(tile => {
        tile.addEventListener('click', function() {
            if (this.parentElement === tileBank) dropZone.appendChild(this);
            else tileBank.appendChild(this);
            
            if (dropZone.children.length > 0) btnCheck.classList.remove('opacity-50', 'pointer-events-none');
            else btnCheck.classList.add('opacity-50', 'pointer-events-none');
        });
    });

    document.getElementById('btn-close-error').addEventListener('click', () => errorPanel.classList.add('translate-y-full'));

    btnCheck.addEventListener('click', () => {
        const currentAnswer = Array.from(dropZone.children).map(t => t.dataset.word).join('');
        const expectedAnswer = ex.expected.join('');

        if (currentAnswer === expectedAnswer) {
            btnCheck.classList.replace('bg-slate-900', 'bg-emerald-500');
            btnCheck.classList.replace('hover:bg-slate-800', 'hover:bg-emerald-600');
            btnCheck.innerHTML = '<i data-lucide="check-circle" class="w-6 h-6 inline mr-2"></i> ¡Correcto!';
            lucide.createIcons();
            setTimeout(() => { currentExIndex++; renderExercise(theme); }, 1000);
        } else {
            errorsInCurrentTheme++;
            errorPanel.classList.remove('translate-y-full');
            while (dropZone.firstChild) tileBank.appendChild(dropZone.firstChild);
            btnCheck.classList.add('opacity-50', 'pointer-events-none');
        }
    });
};

const renderClozeExercise = (theme, ex) => {
    let options = [ex.expected, ...ex.distractors].sort(() => Math.random() - 0.5);
    const jaText = ex.ja_template.replace('[?]', `<span class="inline-block min-w-[3rem] border-b-2 border-dashed border-indigo-300 mx-1 px-2 text-center text-indigo-500 font-bold bg-indigo-50/50 rounded-t">___</span>`);

    document.getElementById('app-view').innerHTML = `
        <div class="fade-in max-w-xl mx-auto w-full pt-4 pb-24 flex flex-col h-[85vh]">
            <header class="flex items-center justify-between mb-8 px-2">
                <button id="btn-quit-ex" class="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full shadow-sm"><i data-lucide="x"></i></button>
                <span class="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-wider">Hueco Crítico</span>
                <span class="text-xs font-mono font-bold text-slate-400">${currentExIndex + 1}/${currentExercises.length}</span>
            </header>

            <div class="text-center mb-8">
                <p class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Completa</p>
                <h2 class="es-text text-lg font-medium text-slate-600 mb-6">${ex.es}</h2>
                <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-3xl leading-relaxed">${jaText}</div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-auto mb-8" id="cloze-options">
                ${options.map(opt => `
                    <button class="cloze-btn bg-white border-2 border-slate-200 py-6 rounded-2xl text-2xl font-bold text-slate-800 shadow-sm hover:border-indigo-400 active:scale-95 transition-all" data-ans="${opt}">${opt}</button>
                `).join('')}
            </div>
            
            <div id="error-panel" class="fixed bottom-0 left-0 w-full bg-rose-50 border-t-2 border-rose-500 p-6 transform translate-y-full transition-transform duration-300 shadow-2xl z-50 rounded-t-3xl max-w-3xl mx-auto right-0">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-bold text-rose-800 text-lg flex items-center gap-2"><i data-lucide="alert-circle" class="w-5 h-5"></i> Error</h3>
                        <p class="text-rose-600 text-sm mt-1">Has seleccionado la partícula/desinencia equivocada.</p>
                    </div>
                    <button id="btn-close-error" class="p-2 bg-rose-100 text-rose-500 rounded-full hover:bg-rose-200"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();

    document.getElementById('btn-quit-ex').addEventListener('click', () => {
        theme.type === 'checkpoint' ? renderDashboard() : renderGuideMode(theme);
    });
    
    const errorPanel = document.getElementById('error-panel');
    document.getElementById('btn-close-error').addEventListener('click', () => errorPanel.classList.add('translate-y-full'));

    const clozeBtns = document.querySelectorAll('.cloze-btn');
    clozeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            clozeBtns.forEach(b => b.disabled = true);
            
            if (this.dataset.ans === ex.expected) {
                this.classList.replace('border-slate-200', 'border-emerald-500');
                this.classList.add('bg-emerald-50', 'text-emerald-700');
                setTimeout(() => { currentExIndex++; renderExercise(theme); }, 1000);
            } else {
                errorsInCurrentTheme++;
                this.classList.replace('border-slate-200', 'border-rose-500');
                this.classList.add('bg-rose-50', 'text-rose-700');
                errorPanel.classList.remove('translate-y-full');
                
                const correctBtn = Array.from(clozeBtns).find(b => b.dataset.ans === ex.expected);
                correctBtn.classList.replace('border-slate-200', 'border-emerald-500');
                correctBtn.classList.add('bg-emerald-50');
                
                setTimeout(() => {
                    clozeBtns.forEach(b => {
                        b.disabled = false;
                        b.className = "cloze-btn bg-white border-2 border-slate-200 py-6 rounded-2xl text-2xl font-bold text-slate-800 shadow-sm hover:border-indigo-400 active:scale-95 transition-all";
                    });
                }, 2500);
            }
        });
    });
};

const renderClassifierExercise = (theme, ex) => {
    let currentItemIndex = 0;
    
    const renderCurrentCard = () => {
        if (currentItemIndex >= ex.items.length) {
            currentExIndex++;
            return renderExercise(theme);
        }
        
        const item = ex.items[currentItemIndex];
        
        document.getElementById('app-view').innerHTML = `
            <div class="fade-in max-w-xl mx-auto w-full pt-4 pb-24 flex flex-col h-[85vh]">
                <header class="flex items-center justify-between mb-8 px-2">
                    <button id="btn-quit-ex" class="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full shadow-sm"><i data-lucide="x"></i></button>
                    <span class="text-xs font-bold text-pink-600 bg-pink-50 px-3 py-1 rounded-full uppercase tracking-wider">Clasificador</span>
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

                <div id="error-panel" class="fixed bottom-0 left-0 w-full bg-rose-50 border-t-2 border-rose-500 p-6 transform translate-y-full transition-transform duration-300 shadow-2xl z-50 rounded-t-3xl max-w-3xl mx-auto right-0">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="font-bold text-rose-800 text-lg flex items-center gap-2"><i data-lucide="alert-circle" class="w-5 h-5"></i> Incorrecto</h3>
                            <p id="error-reason" class="text-rose-700 text-sm mt-2 font-medium leading-relaxed"></p>
                        </div>
                        <button id="btn-close-error" class="p-2 bg-rose-100 text-rose-500 rounded-full hover:bg-rose-200"><i data-lucide="x" class="w-5 h-5"></i></button>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();

        document.getElementById('btn-quit-ex').addEventListener('click', () => {
            theme.type === 'checkpoint' ? renderDashboard() : renderGuideMode(theme);
        });
        
        const errorPanel = document.getElementById('error-panel');
        const flashcard = document.getElementById('flashcard');
        
        document.getElementById('btn-close-error').addEventListener('click', () => errorPanel.classList.add('translate-y-full'));

        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (!errorPanel.classList.contains('translate-y-full')) return;

                if (this.dataset.cat === item.expected) {
                    flashcard.classList.replace('border-slate-200', 'border-emerald-500');
                    flashcard.classList.add('bg-emerald-50', 'text-emerald-700');
                    setTimeout(() => { currentItemIndex++; renderCurrentCard(); }, 600);
                } else {
                    errorsInCurrentTheme++;
                    flashcard.classList.add('animate-shake', 'border-rose-500', 'bg-rose-50');
                    setTimeout(() => flashcard.classList.remove('animate-shake', 'border-rose-500', 'bg-rose-50'), 300);
                    document.getElementById('error-reason').textContent = item.rule;
                    errorPanel.classList.remove('translate-y-full');
                }
            });
        });
    };
    
    renderCurrentCard();
};

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
        document.getElementById('btn-modal-export').addEventListener('click', () => { exportProgress(); closeModal(); });
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