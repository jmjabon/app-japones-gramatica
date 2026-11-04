import { loadProgress, toggleBookmark, exportProgress, importProgress } from './storage.js';

let appState = loadProgress();
let grammarData = [];

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
                <div class="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl text-xl md:text-2xl tracking-wide relative z-10">
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
        alert('El módulo de práctica (Andamiaje y Clasificador) se implementará en la siguiente fase.');
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