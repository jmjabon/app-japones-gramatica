const STORAGE_KEY = 'kikunihongo_grammar_state';

export const loadProgress = () => {
    const defaultState = { completed_themes: [], bookmarks: [] };
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultState;
};

export const saveProgress = (state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const toggleBookmark = (themeId) => {
    const state = loadProgress();
    const index = state.bookmarks.indexOf(themeId);
    if (index > -1) {
        state.bookmarks.splice(index, 1);
    } else {
        state.bookmarks.push(themeId);
    }
    saveProgress(state);
    return state.bookmarks;
};

export const exportProgress = () => {
    const data = localStorage.getItem(STORAGE_KEY) || '{}';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kiku_grammar_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
};

export const importProgress = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.completed_themes) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                callback();
            }
        } catch(err) {
            alert('Archivo JSON no válido.');
        }
    };
    reader.readAsText(file);
};