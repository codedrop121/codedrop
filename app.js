// ============================================================
// CodeDrop - Drop code, see a website
// ============================================================
window.onerror = function(msg, url, line, col, err) {
  document.body.innerHTML = '<div style="padding:40px;color:#f00;font-family:monospace;font-size:16px;background:#111;min-height:100vh;"><h2>JS Error:</h2><pre>' + msg + '\nLine: ' + line + ', Col: ' + col + '\n' + (err && err.stack ? err.stack : '') + '</pre></div>';
};

const state = {
  files: {},       // { filename: content }
  activeFile: null,
  isFullscreen: false,
};

// --- DOM refs ---
const dropzone = document.getElementById('dropzone');
const editorPreview = document.getElementById('editor-preview');
const fileTabs = document.getElementById('file-tabs');
const codeEditor = document.getElementById('code-editor');
const previewFrame = document.getElementById('preview-frame');
const fileInput = document.getElementById('file-input');
const pasteArea = document.getElementById('paste-area');
const pasteRenderBtn = document.getElementById('paste-render-btn');
const resetBtn = document.getElementById('reset-btn');
const refreshBtn = document.getElementById('refresh-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const downloadBtn = document.getElementById('download-btn');
const launchBtn = document.getElementById('launch-btn');
const previewAnotherBtn = document.getElementById('preview-another-btn');
const addFileBtn = document.getElementById('add-file-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');
const newFileName = document.getElementById('new-file-name');
const resizer = document.getElementById('resizer');
const pasteSection = document.getElementById('paste-section');
const themeToggle = document.getElementById('theme-toggle');
const runBtn = document.getElementById('run-btn');
const shareBtn = document.getElementById('share-btn');
const toast = document.getElementById('toast');
const sharedView = document.getElementById('shared-view');
const sharedFrame = document.getElementById('shared-frame');
const sharedEditBtn = document.getElementById('shared-edit-btn');

// --- File helpers ---

function getFileType(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['html', 'htm'].includes(ext)) return 'html';
  if (ext === 'css') return 'css';
  if (['js', 'mjs'].includes(ext)) return 'js';
  if (ext === 'ts') return 'typescript';
  if (ext === 'tsx') return 'tsx';
  if (ext === 'jsx') return 'jsx';
  if (ext === 'rs') return 'rust';
  if (ext === 'py') return 'python';
  if (ext === 'c') return 'c';
  if (['cpp', 'cc', 'cxx'].includes(ext)) return 'cpp';
  if (ext === 'h' || ext === 'hpp') return 'c-header';
  if (ext === 'java') return 'java';
  if (ext === 'go') return 'go';
  if (ext === 'rb') return 'ruby';
  if (ext === 'php') return 'php';
  if (ext === 'swift') return 'swift';
  if (ext === 'kt' || ext === 'kts') return 'kotlin';
  if (ext === 'cs') return 'csharp';
  if (ext === 'lua') return 'lua';
  if (ext === 'r') return 'r';
  if (ext === 'pl' || ext === 'pm') return 'perl';
  if (ext === 'sh' || ext === 'bash') return 'bash';
  if (ext === 'ps1') return 'powershell';
  if (ext === 'sql') return 'sql';
  if (ext === 'dart') return 'dart';
  if (ext === 'scala') return 'scala';
  if (ext === 'hs') return 'haskell';
  if (ext === 'ex' || ext === 'exs') return 'elixir';
  if (ext === 'erl') return 'erlang';
  if (ext === 'clj' || ext === 'cljs') return 'clojure';
  if (ext === 'zig') return 'zig';
  if (ext === 'nim') return 'nim';
  if (ext === 'v') return 'v';
  if (ext === 'jl') return 'julia';
  if (ext === 'ml' || ext === 'mli') return 'ocaml';
  if (ext === 'fs' || ext === 'fsx') return 'fsharp';
  if (ext === 'lisp' || ext === 'lsp') return 'lisp';
  if (ext === 'asm' || ext === 's') return 'assembly';
  if (ext === 'yaml' || ext === 'yml') return 'yaml';
  if (ext === 'toml') return 'toml';
  if (ext === 'json') return 'json';
  if (ext === 'xml') return 'xml';
  if (ext === 'md') return 'markdown';
  if (ext === 'txt') return 'text';
  if (ext === 'svg') return 'svg';
  if (ext === 'ini' || ext === 'cfg') return 'config';
  if (ext === 'dockerfile') return 'dockerfile';
  if (ext === 'makefile' || name.toLowerCase() === 'makefile') return 'makefile';
  if (ext === 'cmake') return 'cmake';
  if (ext === 'gradle') return 'gradle';
  if (ext === 'tf') return 'terraform';
  if (ext === 'proto') return 'protobuf';
  if (ext === 'graphql' || ext === 'gql') return 'graphql';
  return 'other';
}

function findHtmlFile() {
  const names = Object.keys(state.files);
  return names.find(n => n.toLowerCase() === 'index.html')
    || names.find(n => getFileType(n) === 'html')
    || null;
}

// --- Read dropped/selected files ---

async function readFiles(fileList) {
  const textExts = [
    'html','htm','css','js','mjs','ts','tsx','jsx','json','svg','txt','xml','md',
    'rs','toml','py','c','cpp','cc','cxx','h','hpp','java','go','rb','php',
    'swift','kt','kts','cs','lua','r','pl','pm','sh','bash','ps1','sql',
    'dart','scala','hs','ex','exs','erl','clj','cljs','zig','nim','v','jl',
    'ml','mli','fs','fsx','lisp','lsp','asm','s','yaml','yml','ini','cfg',
    'dockerfile','makefile','cmake','gradle','tf','proto','graphql','gql'
  ];

  for (const file of fileList) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (textExts.includes(ext)) {
      state.files[file.name] = await file.text();
    } else if (file.type.startsWith('image/')) {
      const dataUrl = await fileToDataUrl(file);
      state.files[file.name] = dataUrl;
    }
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- Render tabs ---

function renderTabs() {
  fileTabs.innerHTML = '';
  const names = Object.keys(state.files);

  names.forEach(name => {
    const tab = document.createElement('button');
    tab.className = 'file-tab' + (name === state.activeFile ? ' active' : '');

    const type = getFileType(name);
    tab.innerHTML = '<span class="dot ' + type + '"></span>' + escapeHtml(name) + '<span class="close-tab">&times;</span>';

    tab.addEventListener('click', (e) => {
      if (e.target.classList.contains('close-tab')) {
        deleteFile(name);
        return;
      }
      switchToFile(name);
    });

    fileTabs.appendChild(tab);
  });
}

function switchToFile(name) {
  if (state.activeFile && state.files.hasOwnProperty(state.activeFile)) {
    state.files[state.activeFile] = codeEditor.value;
  }

  state.activeFile = name;
  codeEditor.value = state.files[name] || '';
  renderTabs();
}

function deleteFile(name) {
  delete state.files[name];
  const remaining = Object.keys(state.files);

  if (remaining.length === 0) {
    resetAll();
    return;
  }

  if (state.activeFile === name) {
    state.activeFile = remaining[0];
    codeEditor.value = state.files[state.activeFile] || '';
  }

  renderTabs();
  updatePreview();
}

// --- Preview ---

function buildPreviewHtml() {
  if (state.activeFile && state.files.hasOwnProperty(state.activeFile)) {
    state.files[state.activeFile] = codeEditor.value;
  }

  const htmlFile = findHtmlFile();

  if (htmlFile) {
    var html = state.files[htmlFile];

    // Inline CSS files
    Object.keys(state.files).forEach(function(name) {
      if (getFileType(name) === 'css') {
        var cssContent = state.files[name];
        var escaped = escapeRegex(name);
        var pattern = new RegExp('<link[^>]*href=["\'](?:\\.\\/)?' + escaped + '["\'][^>]*>', 'gi');
        var before = html;
        html = html.replace(pattern, '<style>\n' + cssContent + '\n</style>');
        if (html === before) {
          var headClose = html.toLowerCase().indexOf('</head>');
          if (headClose !== -1) {
            html = html.slice(0, headClose) + '<style>\n' + cssContent + '\n</style>\n' + html.slice(headClose);
          }
        }
      }
    });

    // Inline JS files
    Object.keys(state.files).forEach(function(name) {
      if (getFileType(name) === 'js') {
        var jsContent = state.files[name];
        var escaped = escapeRegex(name);
        var pattern = new RegExp('<script[^>]*src=["\'](?:\\.\\/)?' + escaped + '["\'][^>]*>\\s*<\\/script>', 'gi');
        var before = html;
        html = html.replace(pattern, '<script>\n' + jsContent + '\n<\/script>');
        if (html === before) {
          var bodyClose = html.toLowerCase().indexOf('</body>');
          if (bodyClose !== -1) {
            html = html.slice(0, bodyClose) + '<script>\n' + jsContent + '\n<\/script>\n' + html.slice(bodyClose);
          }
        }
      }
    });

    // Replace image references with data URLs
    Object.keys(state.files).forEach(function(name) {
      if (getFileType(name) === 'other' && state.files[name].startsWith && state.files[name].startsWith('data:')) {
        var patterns = [
          new RegExp('(src|href)=["\']' + escapeRegex(name) + '["\']', 'gi'),
          new RegExp('(src|href)=["\']\\./' + escapeRegex(name) + '["\']', 'gi'),
          new RegExp('url\\(["\']?' + escapeRegex(name) + '["\']?\\)', 'gi'),
          new RegExp('url\\(["\']?\\./' + escapeRegex(name) + '["\']?\\)', 'gi'),
        ];
        patterns.forEach(function(pattern) {
          html = html.replace(pattern, function(match, attr) {
            if (attr) return attr + '="' + state.files[name] + '"';
            return 'url("' + state.files[name] + '")';
          });
        });
      }
    });

    return html;
  }

  // No HTML file - construct one from CSS/JS or show code viewer
  var css = '';
  var js = '';
  var codeFiles = [];

  Object.keys(state.files).forEach(function(name) {
    var type = getFileType(name);
    if (type === 'css') css += state.files[name] + '\n';
    else if (type === 'js') js += state.files[name] + '\n';
    else if (type !== 'other' || (!state.files[name].startsWith || !state.files[name].startsWith('data:'))) {
      codeFiles.push(name);
    }
  });

  // If we have CSS or JS, build a page from them
  if (css || js) {
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <style>' + css + '</style>\n</head>\n<body>\n  ' + (js ? '<script>' + js + '<\/script>' : '') + '\n</body>\n</html>';
  }

  // No web files - show a formatted code viewer
  if (codeFiles.length > 0) {
    var codeViewerHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>';
    codeViewerHtml += 'body { margin: 0; padding: 0; background: #1e1e2e; color: #cdd6f4; font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace; font-size: 13px; }';
    codeViewerHtml += '.file-block { margin: 0; padding: 0; }';
    codeViewerHtml += '.file-header { background: #313244; color: #89b4fa; padding: 10px 20px; font-weight: 700; font-size: 14px; border-bottom: 1px solid #45475a; position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 8px; }';
    codeViewerHtml += '.file-dot { width: 8px; height: 8px; border-radius: 50%; }';
    codeViewerHtml += '.dot-rust { background: #dea584; }';
    codeViewerHtml += '.dot-python { background: #3572A5; }';
    codeViewerHtml += '.dot-c { background: #555555; }';
    codeViewerHtml += '.dot-cpp { background: #f34b7d; }';
    codeViewerHtml += '.dot-java { background: #b07219; }';
    codeViewerHtml += '.dot-go { background: #00ADD8; }';
    codeViewerHtml += '.dot-ruby { background: #701516; }';
    codeViewerHtml += '.dot-php { background: #4F5D95; }';
    codeViewerHtml += '.dot-swift { background: #F05138; }';
    codeViewerHtml += '.dot-kotlin { background: #A97BFF; }';
    codeViewerHtml += '.dot-csharp { background: #178600; }';
    codeViewerHtml += '.dot-typescript { background: #3178C6; }';
    codeViewerHtml += '.dot-lua { background: #000080; }';
    codeViewerHtml += '.dot-r { background: #198CE7; }';
    codeViewerHtml += '.dot-perl { background: #0298c3; }';
    codeViewerHtml += '.dot-bash { background: #89e051; }';
    codeViewerHtml += '.dot-sql { background: #e38c00; }';
    codeViewerHtml += '.dot-dart { background: #00B4AB; }';
    codeViewerHtml += '.dot-scala { background: #c22d40; }';
    codeViewerHtml += '.dot-haskell { background: #5e5086; }';
    codeViewerHtml += '.dot-elixir { background: #6e4a7e; }';
    codeViewerHtml += '.dot-zig { background: #ec915c; }';
    codeViewerHtml += '.dot-julia { background: #a270ba; }';
    codeViewerHtml += '.dot-ocaml { background: #3be133; }';
    codeViewerHtml += '.dot-fsharp { background: #b845fc; }';
    codeViewerHtml += '.dot-clojure { background: #db5855; }';
    codeViewerHtml += '.dot-other { background: #7d8590; }';
    codeViewerHtml += '.code-wrap { display: flex; overflow-x: auto; }';
    codeViewerHtml += '.line-nums { padding: 12px 0; text-align: right; user-select: none; color: #585b70; border-right: 1px solid #45475a; min-width: 48px; }';
    codeViewerHtml += '.line-nums span { display: block; padding: 0 12px; line-height: 1.6; }';
    codeViewerHtml += '.code-content { padding: 12px 0; flex: 1; overflow-x: auto; }';
    codeViewerHtml += '.code-content pre { margin: 0; padding: 0 16px; line-height: 1.6; white-space: pre; }';
    codeViewerHtml += '.kw { color: #cba6f7; } .fn { color: #89b4fa; } .str { color: #a6e3a1; } .cm { color: #585b70; font-style: italic; } .num { color: #fab387; } .mac { color: #89dceb; } .ty { color: #f9e2af; } .op { color: #94e2d5; }';
    codeViewerHtml += '</style></head><body>';

    codeFiles.forEach(function(name) {
      var content = state.files[name];
      var type = getFileType(name);
      var dotClasses = {
        rust:'dot-rust', python:'dot-python', c:'dot-c', cpp:'dot-cpp', 'c-header':'dot-c',
        java:'dot-java', go:'dot-go', ruby:'dot-ruby', php:'dot-php', swift:'dot-swift',
        kotlin:'dot-kotlin', csharp:'dot-csharp', typescript:'dot-typescript', tsx:'dot-typescript',
        jsx:'dot-java', lua:'dot-lua', r:'dot-r', perl:'dot-perl', bash:'dot-bash',
        powershell:'dot-bash', sql:'dot-sql', dart:'dot-dart', scala:'dot-scala',
        haskell:'dot-haskell', elixir:'dot-elixir', zig:'dot-zig', julia:'dot-julia',
        ocaml:'dot-ocaml', fsharp:'dot-fsharp', clojure:'dot-clojure'
      };
      var dotClass = dotClasses[type] || 'dot-other';

      // Escape HTML
      var escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      // Syntax highlighting
      escaped = highlightCode(escaped, type);

      var lines = escaped.split('\n');
      var lineNums = '';
      for (var i = 0; i < lines.length; i++) {
        lineNums += '<span>' + (i + 1) + '</span>';
      }

      codeViewerHtml += '<div class="file-block">';
      codeViewerHtml += '<div class="file-header"><span class="file-dot ' + dotClass + '"></span>' + name + '</div>';
      codeViewerHtml += '<div class="code-wrap"><div class="line-nums">' + lineNums + '</div>';
      codeViewerHtml += '<div class="code-content"><pre>' + escaped + '</pre></div></div>';
      codeViewerHtml += '</div>';
    });

    codeViewerHtml += '</body></html>';
    return codeViewerHtml;
  }

  return '<!DOCTYPE html><html><body></body></html>';
}

function updatePreview() {
  var html = buildPreviewHtml();
  previewFrame.srcdoc = html;
}

// --- Activate editor mode ---

function activateEditor() {
  dropzone.style.display = 'none';
  editorPreview.style.display = 'flex';
  pasteSection.style.display = 'none';

  var names = Object.keys(state.files);
  if (names.length > 0 && !state.activeFile) {
    state.activeFile = findHtmlFile() || names[0];
  }

  codeEditor.value = state.files[state.activeFile] || '';
  renderTabs();
  updateRunButton();
  updatePreview();
}

var runnableTypes = ['rust','python','c','cpp','go','java','ruby','php','lua','perl','bash','haskell','csharp','kotlin','swift','scala','r','elixir','clojure','typescript','julia'];

function updateRunButton() {
  var runnableFile = Object.keys(state.files).find(function(name) {
    return runnableTypes.indexOf(getFileType(name)) !== -1;
  });
  if (runnableFile) {
    runBtn.style.display = 'flex';
    var type = getFileType(runnableFile);
    var langNames = {
      rust:'Rust', python:'Python', c:'C', cpp:'C++', go:'Go', java:'Java',
      ruby:'Ruby', php:'PHP', lua:'Lua', perl:'Perl', bash:'Bash',
      haskell:'Haskell', csharp:'C#', kotlin:'Kotlin', swift:'Swift',
      scala:'Scala', r:'R', elixir:'Elixir', clojure:'Clojure',
      typescript:'TypeScript', julia:'Julia'
    };
    runBtn.title = 'Run code (' + (langNames[type] || type) + ')';
  } else {
    runBtn.style.display = 'none';
  }
}

function resetAll() {
  state.files = {};
  state.activeFile = null;
  state.isFullscreen = false;
  codeEditor.value = '';

  dropzone.style.display = 'flex';
  editorPreview.style.display = 'none';
  pasteSection.style.display = 'flex';
  editorPreview.classList.remove('preview-fullscreen');

  previewFrame.srcdoc = '';
}

// --- Drag & Drop ---

document.addEventListener('dragover', function(e) {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

document.addEventListener('dragleave', function(e) {
  if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
    dropzone.classList.remove('drag-over');
  }
});

document.addEventListener('drop', async function(e) {
  e.preventDefault();
  dropzone.classList.remove('drag-over');

  var items = e.dataTransfer.items;
  if (!items || items.length === 0) return;

  var entries = [];
  for (var i = 0; i < items.length; i++) {
    var entry = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
    if (entry) entries.push(entry);
  }

  if (entries.length > 0) {
    var files = await readEntries(entries);
    await readFiles(files);
  } else {
    await readFiles(e.dataTransfer.files);
  }

  if (Object.keys(state.files).length > 0) {
    activateEditor();
  }
});

async function readEntries(entries) {
  var files = [];

  async function processEntry(entry) {
    if (entry.isFile) {
      var file = await new Promise(function(resolve) { entry.file(resolve); });
      files.push(file);
    } else if (entry.isDirectory) {
      var reader = entry.createReader();
      var subEntries = await new Promise(function(resolve) { reader.readEntries(resolve); });
      for (var i = 0; i < subEntries.length; i++) {
        await processEntry(subEntries[i]);
      }
    }
  }

  for (var i = 0; i < entries.length; i++) {
    await processEntry(entries[i]);
  }

  return files;
}

// --- File input ---

fileInput.addEventListener('change', async function() {
  if (fileInput.files.length > 0) {
    await readFiles(fileInput.files);
    if (Object.keys(state.files).length > 0) {
      activateEditor();
    }
  }
  fileInput.value = '';
});

// --- Paste & Render ---

pasteRenderBtn.addEventListener('click', function() {
  var code = pasteArea.value.trim();
  if (!code) return;

  state.files['index.html'] = code;
  pasteArea.value = '';
  activateEditor();
});

// --- Editor events ---

var debounceTimer = null;
codeEditor.addEventListener('input', function() {
  if (state.activeFile) {
    state.files[state.activeFile] = codeEditor.value;
  }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(updatePreview, 400);
});

// Tab key support in editor
codeEditor.addEventListener('keydown', function(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    var start = codeEditor.selectionStart;
    var end = codeEditor.selectionEnd;
    codeEditor.value = codeEditor.value.substring(0, start) + '  ' + codeEditor.value.substring(end);
    codeEditor.selectionStart = codeEditor.selectionEnd = start + 2;

    if (state.activeFile) {
      state.files[state.activeFile] = codeEditor.value;
    }
  }
});

// --- Toolbar buttons ---

resetBtn.addEventListener('click', resetAll);

refreshBtn.addEventListener('click', updatePreview);

fullscreenBtn.addEventListener('click', function() {
  state.isFullscreen = !state.isFullscreen;
  editorPreview.classList.toggle('preview-fullscreen', state.isFullscreen);
});

downloadBtn.addEventListener('click', function() {
  var html = buildPreviewHtml();
  var blob = new Blob([html], { type: 'text/html' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'website.html';
  a.click();
  URL.revokeObjectURL(url);
});

// --- Launch as live site in new tab ---

launchBtn.addEventListener('click', async function() {
  var html = buildPreviewHtml();
  var launchLabel = launchBtn.querySelector('.launch-label');
  launchLabel.textContent = 'Creating...';

  // Compress HTML into URL using lz-string (runs locally, always works)
  var compressed = LZString.compressToEncodedURIComponent(html);
  var baseUrl = window.location.href.split('#')[0].split('?')[0];
  var viewUrl = baseUrl + '#c=' + compressed;

  // Try to shorten with is.gd (supports CORS)
  if (viewUrl.length < 15000) {
    try {
      var shortRes = await fetch('https://is.gd/create.php?format=json&url=' + encodeURIComponent(viewUrl));
      if (shortRes.ok) {
        var data = await shortRes.json();
        if (data.shorturl) viewUrl = data.shorturl;
      }
    } catch (e) { /* shortening failed, use full URL */ }
  }

  var newTab = window.open(viewUrl, '_blank');
  if (!newTab) alert('Pop-up blocked! Allow pop-ups and try again.');

  launchLabel.textContent = 'Launch';
});

// --- Run Rust Code ---

// Wandbox compiler mapping (has Access-Control-Allow-Origin: *)
var wandboxLangs = {
  rust: 'rust-1.78.0',
  python: 'cpython-3.13.8',
  c: 'gcc-13.2.0-c',
  cpp: 'gcc-13.2.0',
  java: null, // not on Wandbox, use special handling
  go: null,
  ruby: 'ruby-3.4.1',
  php: 'php-8.3.12',
  lua: null,
  perl: 'perl-5.42.0',
  bash: 'bash',
  haskell: null,
  csharp: 'dotnetcore-8.0.402',
  swift: 'swift-6.0.1',
  scala: 'scala-3.5.1',
  r: 'r-4.4.1',
  elixir: 'elixir-1.17.3',
  clojure: null,
  typescript: 'typescript-5.6.2',
  kotlin: null,
  julia: null,
  dart: null,
  zig: 'zig-0.13.0',
  erlang: 'erlang-27.1',
  lisp: 'sbcl-2.4.9'
};

runBtn.addEventListener('click', async function() {
  var runnableFile = Object.keys(state.files).find(function(name) {
    return runnableTypes.indexOf(getFileType(name)) !== -1;
  });
  if (!runnableFile) return;

  if (state.activeFile && state.files.hasOwnProperty(state.activeFile)) {
    state.files[state.activeFile] = codeEditor.value;
  }

  var code = state.files[runnableFile];
  var type = getFileType(runnableFile);
  var label = runBtn.querySelector('.launch-label');
  label.textContent = 'Running...';
  runBtn.classList.add('running');
  previewFrame.srcdoc = buildRunOutputHtml('Compiling...', '', true);

  try {
    var compiler = wandboxLangs[type];
    if (!compiler) {
      previewFrame.srcdoc = buildRunOutputHtml('', 'No online compiler available for ' + type + ' yet.\nSupported: Rust, Python, C, C++, Ruby, PHP, Perl, Bash, C#, Swift, Scala, R, Elixir, TypeScript, Zig, Erlang, Lisp', false, false);
      label.textContent = 'Run';
      runBtn.classList.remove('running');
      return;
    }

    var res = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compiler: compiler,
        code: code,
        options: type === 'rust' ? '' : '',
        stdin: '',
        'compiler-option-raw': type === 'rust' ? '--edition=2021' : '',
        'runtime-option-raw': '',
        save: false
      })
    });

    if (!res.ok) {
      var errText = await res.text();
      throw new Error('Server error: ' + res.status + ' ' + errText);
    }

    var data = await res.json();
    var stdout = data.program_output || '';
    var stderr = data.compiler_error || data.compiler_message || '';
    var success = (data.status === '0' || data.status === 0);

    // Some compilers put output in program_message
    if (!stdout && data.program_message) {
      stdout = data.program_message;
    }

    // Add helpful info when external crates are missing
    var hasMissingDeps = stderr && (
      stderr.indexOf('unresolved import') !== -1 ||
      stderr.indexOf('maybe a missing crate') !== -1 ||
      stderr.indexOf('ModuleNotFoundError') !== -1 ||
      stderr.indexOf('No module named') !== -1 ||
      stderr.indexOf('cannot find') !== -1 ||
      stderr.indexOf('undefined reference') !== -1 ||
      stderr.indexOf('fatal error:') !== -1
    );
    if (!success && hasMissingDeps) {
      var langNotes = {
        rust: '\n\n────────────────────────────────\n⚠ External Crates Not Available\n────────────────────────────────\nOnline compilers only have the standard library.\nCrates from crates.io (tokio, serde, hyper, etc.) cannot be installed.\n\nTo run this code, use "cargo run" on your machine.\n\nCodeDrop Run works best with self-contained programs\nthat only use "use std::...".',
        python: '\n\n────────────────────────────────\n⚠ External Packages Not Available\n────────────────────────────────\nOnly the Python standard library is available.\nPackages from pip (requests, numpy, etc.) are not installed.\n\nTo run this code, use "python" on your machine.',
        c: '\n\n────────────────────────────────\n⚠ External Libraries Not Available\n────────────────────────────────\nOnly standard C libraries are available.\nThird-party libraries cannot be linked.',
        cpp: '\n\n────────────────────────────────\n⚠ External Libraries Not Available\n────────────────────────────────\nOnly the C++ standard library is available.\nThird-party libraries (Boost, etc.) cannot be linked.'
      };
      stderr += langNotes[type] || '\n\n⚠ Only the standard library is available. External packages/crates cannot be used in the online compiler.';
    }

    previewFrame.srcdoc = buildRunOutputHtml(stdout, stderr, false, success);
  } catch (err) {
    var hint = '';
    if (err.message === 'Failed to fetch') {
      hint = '\n\nThis usually means:\n1. You are opening from file:// — use http://localhost:3000 instead\n2. Your browser or antivirus is blocking the request\n3. You have no internet connection\n\nCurrent page URL: ' + window.location.href;
    }
    previewFrame.srcdoc = buildRunOutputHtml('', 'Error: ' + err.message + hint, false, false);
  }

  label.textContent = 'Run';
  runBtn.classList.remove('running');
});

function buildRunOutputHtml(stdout, stderr, isLoading, success) {
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>';
  html += 'body { margin: 0; padding: 0; background: #1e1e2e; color: #cdd6f4; font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace; font-size: 13px; }';
  html += '.header { background: #313244; padding: 10px 20px; font-weight: 700; font-size: 14px; border-bottom: 1px solid #45475a; display: flex; align-items: center; gap: 8px; }';
  html += '.status { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }';
  html += '.status.success { background: #a6e3a1; }';
  html += '.status.error { background: #f38ba8; }';
  html += '.status.loading { background: #f9e2af; animation: pulse 1s infinite; }';
  html += '@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }';
  html += '.output { padding: 16px 20px; white-space: pre-wrap; word-wrap: break-word; line-height: 1.6; }';
  html += '.stderr { color: #f38ba8; }';
  html += '.stdout { color: #a6e3a1; }';
  html += '.section-label { color: #585b70; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }';
  html += '.section { margin-bottom: 16px; }';
  html += '</style></head><body>';

  if (isLoading) {
    html += '<div class="header"><span class="status loading"></span> Compiling & Running...</div>';
    html += '<div class="output"><span style="color:#f9e2af;">Sending code to compiler...</span></div>';
  } else {
    var statusClass = success ? 'success' : 'error';
    var statusText = success ? 'Success' : 'Error';
    html += '<div class="header"><span class="status ' + statusClass + '"></span> ' + statusText + '</div>';

    html += '<div class="output">';

    if (stderr) {
      html += '<div class="section"><div class="section-label">Compiler Output</div>';
      html += '<div class="stderr">' + escapeForOutput(stderr) + '</div></div>';
    }

    if (stdout) {
      html += '<div class="section"><div class="section-label">Program Output</div>';
      html += '<div class="stdout">' + escapeForOutput(stdout) + '</div></div>';
    }

    if (!stdout && !stderr) {
      html += '<div style="color:#585b70;">(no output)</div>';
    }

    html += '</div>';
  }

  html += '</body></html>';
  return html;
}

function escapeForOutput(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Preview Another ---

previewAnotherBtn.addEventListener('click', function() {
  resetAll();
});

// --- Add file modal ---

addFileBtn.addEventListener('click', function() {
  newFileName.value = '';
  modalOverlay.style.display = 'flex';
  newFileName.focus();
});

modalCancel.addEventListener('click', function() {
  modalOverlay.style.display = 'none';
});

modalConfirm.addEventListener('click', function() {
  var name = newFileName.value.trim();
  if (!name) return;
  if (!state.files[name]) {
    state.files[name] = '';
  }
  modalOverlay.style.display = 'none';
  switchToFile(name);
  renderTabs();
});

newFileName.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') modalConfirm.click();
  if (e.key === 'Escape') modalCancel.click();
});

modalOverlay.addEventListener('click', function(e) {
  if (e.target === modalOverlay) modalCancel.click();
});

// --- Share ---

function showToast(msg, duration) {
  duration = duration || 3000;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, duration);
}

shareBtn.addEventListener('click', async function() {
  var html = buildPreviewHtml();
  var label = shareBtn.querySelector('.launch-label');
  label.textContent = 'Creating...';

  // Compress HTML into URL using lz-string (runs locally, always works)
  var compressed = LZString.compressToEncodedURIComponent(html);
  var baseUrl = window.location.href.split('#')[0].split('?')[0];
  var shareUrl = baseUrl + '#c=' + compressed;

  // Try to shorten with is.gd
  if (shareUrl.length < 15000) {
    try {
      var shortRes = await fetch('https://is.gd/create.php?format=json&url=' + encodeURIComponent(shareUrl));
      if (shortRes.ok) {
        var data = await shortRes.json();
        if (data.shorturl) shareUrl = data.shorturl;
      }
    } catch (e) { /* shortening failed, use full URL */ }
  }

  await copyToClipboard(shareUrl);
  showToast('Link copied: ' + shareUrl);
  label.textContent = 'Share';
});

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

// --- Load shared site from URL hash ---

function checkForSharedSite() {
  var hash = window.location.hash;

  if (hash.startsWith('#s=')) {
    var blobId = hash.slice(3);
    showSharedView('Loading...');

    fetch('https://jsonblob.com/api/jsonBlob/' + blobId)
      .then(function(res) {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(function(data) {
        if (data.html) {
          renderSharedSite(data.html);
        } else {
          sharedFrame.srcdoc = '<h2 style="padding:40px;font-family:sans-serif;color:#888;">Could not load shared site.</h2>';
        }
      })
      .catch(function() {
        sharedFrame.srcdoc = '<h2 style="padding:40px;font-family:sans-serif;color:#888;">Shared site not found or expired.</h2>';
      });

    return true;
  }

  if (hash.startsWith('#code=') || hash.startsWith('#c=')) {
    var compressed = hash.startsWith('#c=') ? hash.slice(3) : hash.slice(6);
    var html = LZString.decompressFromEncodedURIComponent(compressed);
    if (!html) return false;
    showSharedView();
    renderSharedSite(html);
    return true;
  }

  return false;
}

function showSharedView(loadingMsg) {
  document.querySelector('.app').style.display = 'none';
  sharedView.style.display = 'flex';
  if (loadingMsg) {
    sharedFrame.srcdoc = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:sans-serif;color:#888;font-size:18px;">' + loadingMsg + '</div>';
  }
}

function renderSharedSite(html) {
  sharedFrame.srcdoc = html;

  sharedEditBtn.onclick = function() {
    history.replaceState(null, '', window.location.pathname);
    sharedView.style.display = 'none';
    document.querySelector('.app').style.display = 'flex';
    state.files['index.html'] = html;
    activateEditor();
  };
}

// --- Resizer ---

var isResizing = false;

resizer.addEventListener('mousedown', function(e) {
  isResizing = true;
  resizer.classList.add('active');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});

document.addEventListener('mousemove', function(e) {
  if (!isResizing) return;

  var container = editorPreview;
  var rect = container.getBoundingClientRect();
  var editorPanel = container.querySelector('.editor-panel');
  var previewPanel = container.querySelector('.preview-panel');

  var offset = e.clientX - rect.left;
  var total = rect.width;
  var percent = (offset / total) * 100;

  if (percent > 15 && percent < 85) {
    editorPanel.style.flex = 'none';
    editorPanel.style.width = percent + '%';
    previewPanel.style.flex = '1';
  }
});

document.addEventListener('mouseup', function() {
  if (isResizing) {
    isResizing = false;
    resizer.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// --- Utilities ---

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- Rust Syntax Highlighting ---

var langDefs = {
  rust: {
    keywords: ['fn','let','mut','pub','struct','enum','impl','trait','use','mod','crate','self','super','if','else','match','for','while','loop','return','break','continue','where','as','in','ref','move','async','await','const','static','type','unsafe','extern','dyn','true','false','macro_rules'],
    types: ['i8','i16','i32','i64','i128','u8','u16','u32','u64','u128','f32','f64','bool','char','str','String','Vec','Option','Result','Box','Rc','Arc','HashMap','HashSet','Self','usize','isize'],
    hasMacros: true
  },
  python: {
    keywords: ['def','class','if','elif','else','for','while','return','import','from','as','try','except','finally','raise','with','yield','lambda','pass','break','continue','and','or','not','in','is','None','True','False','global','nonlocal','assert','del','async','await','print'],
    types: ['int','float','str','bool','list','dict','tuple','set','bytes','None','object','type','complex','range','frozenset']
  },
  c: {
    keywords: ['auto','break','case','char','const','continue','default','do','double','else','enum','extern','float','for','goto','if','inline','int','long','register','restrict','return','short','signed','sizeof','static','struct','switch','typedef','union','unsigned','void','volatile','while','NULL','true','false'],
    types: ['int','char','float','double','long','short','void','unsigned','signed','size_t','FILE','bool']
  },
  cpp: {
    keywords: ['auto','break','case','catch','class','const','constexpr','continue','decltype','default','delete','do','else','enum','explicit','export','extern','final','for','friend','goto','if','inline','mutable','namespace','new','noexcept','nullptr','operator','override','private','protected','public','register','return','sizeof','static','static_cast','dynamic_cast','reinterpret_cast','const_cast','struct','switch','template','this','throw','try','typedef','typeid','typename','union','using','virtual','void','volatile','while','true','false'],
    types: ['int','char','float','double','long','short','void','unsigned','signed','bool','string','vector','map','set','pair','size_t','auto','wchar_t','int8_t','int16_t','int32_t','int64_t','uint8_t','uint16_t','uint32_t','uint64_t']
  },
  java: {
    keywords: ['abstract','assert','boolean','break','byte','case','catch','char','class','const','continue','default','do','double','else','enum','extends','final','finally','float','for','goto','if','implements','import','instanceof','int','interface','long','native','new','package','private','protected','public','return','short','static','strictfp','super','switch','synchronized','this','throw','throws','transient','try','void','volatile','while','true','false','null','var','record','sealed','permits','yield'],
    types: ['String','Integer','Boolean','Double','Float','Long','Short','Byte','Character','Object','List','Map','Set','ArrayList','HashMap','HashSet','Optional','Stream','void','int','char','float','double','long','short','boolean','byte']
  },
  go: {
    keywords: ['break','case','chan','const','continue','default','defer','else','fallthrough','for','func','go','goto','if','import','interface','map','package','range','return','select','struct','switch','type','var','true','false','nil','iota','append','cap','close','copy','delete','len','make','new','panic','print','println','recover'],
    types: ['bool','byte','complex64','complex128','error','float32','float64','int','int8','int16','int32','int64','rune','string','uint','uint8','uint16','uint32','uint64','uintptr','any']
  },
  ruby: {
    keywords: ['alias','and','begin','break','case','class','def','defined','do','else','elsif','end','ensure','false','for','if','in','module','next','nil','not','or','redo','rescue','retry','return','self','super','then','true','undef','unless','until','when','while','yield','require','include','extend','attr_accessor','attr_reader','attr_writer','puts','print','raise'],
    types: ['String','Integer','Float','Array','Hash','Symbol','Proc','Lambda','Regexp','Range','NilClass','TrueClass','FalseClass']
  },
  php: {
    keywords: ['abstract','and','array','as','break','callable','case','catch','class','clone','const','continue','declare','default','die','do','echo','else','elseif','empty','enddeclare','endfor','endforeach','endif','endswitch','endwhile','eval','exit','extends','final','finally','fn','for','foreach','function','global','goto','if','implements','include','include_once','instanceof','insteadof','interface','isset','list','match','namespace','new','or','print','private','protected','public','readonly','require','require_once','return','static','switch','throw','trait','try','unset','use','var','while','xor','yield','true','false','null'],
    types: ['int','float','string','bool','array','object','null','void','mixed','never','self','static','parent']
  },
  swift: {
    keywords: ['actor','any','as','associatedtype','async','await','break','case','catch','class','continue','convenience','default','defer','deinit','didSet','do','else','enum','extension','fallthrough','fileprivate','final','for','func','get','guard','if','import','in','indirect','infix','init','inout','internal','is','lazy','let','mutating','nil','nonmutating','open','operator','optional','override','postfix','precedencegroup','prefix','private','protocol','public','repeat','required','rethrows','return','self','Self','set','some','static','struct','subscript','super','switch','throw','throws','try','typealias','var','weak','where','while','willSet','true','false'],
    types: ['Int','Float','Double','Bool','String','Character','Array','Dictionary','Set','Optional','Any','AnyObject','Void','Error','Result','Codable','Equatable','Hashable']
  },
  kotlin: {
    keywords: ['abstract','actual','annotation','as','break','by','catch','class','companion','const','constructor','continue','crossinline','data','delegate','do','else','enum','expect','external','false','field','file','final','finally','for','fun','get','if','import','in','infix','init','inline','inner','interface','internal','is','it','lateinit','noinline','null','object','open','operator','out','override','package','param','private','property','protected','public','receiver','reified','return','sealed','set','setparam','super','suspend','tailrec','this','throw','true','try','typealias','val','var','vararg','when','where','while','yield'],
    types: ['Int','Long','Short','Byte','Float','Double','Boolean','Char','String','Any','Unit','Nothing','List','Map','Set','Array','MutableList','MutableMap','MutableSet','Pair','Triple']
  },
  csharp: {
    keywords: ['abstract','as','base','bool','break','byte','case','catch','char','checked','class','const','continue','decimal','default','delegate','do','double','else','enum','event','explicit','extern','false','finally','fixed','float','for','foreach','goto','if','implicit','in','int','interface','internal','is','lock','long','namespace','new','null','object','operator','out','override','params','private','protected','public','readonly','record','ref','return','sbyte','sealed','short','sizeof','stackalloc','static','string','struct','switch','this','throw','true','try','typeof','uint','ulong','unchecked','unsafe','ushort','using','var','virtual','void','volatile','while','yield','async','await','dynamic','nameof','when','where','init','required','global'],
    types: ['int','long','float','double','decimal','bool','char','string','byte','short','object','void','var','dynamic','List','Dictionary','HashSet','Array','Task','Action','Func','Tuple','Span','Memory']
  },
  typescript: {
    keywords: ['abstract','any','as','async','await','boolean','break','case','catch','class','const','constructor','continue','declare','default','delete','do','else','enum','export','extends','false','finally','for','from','function','get','if','implements','import','in','infer','instanceof','interface','is','keyof','let','module','namespace','never','new','null','number','object','of','package','private','protected','public','readonly','require','return','set','static','string','super','switch','symbol','this','throw','true','try','type','typeof','undefined','unique','unknown','var','void','while','with','yield'],
    types: ['string','number','boolean','void','null','undefined','any','never','unknown','object','symbol','bigint','Array','Map','Set','Promise','Record','Partial','Required','Readonly','Pick','Omit','Exclude','Extract','NonNullable','ReturnType','Parameters','Awaited']
  },
  lua: {
    keywords: ['and','break','do','else','elseif','end','false','for','function','goto','if','in','local','nil','not','or','repeat','return','then','true','until','while','print','require','pairs','ipairs','type','tostring','tonumber','table','string','math','io','os','error','pcall','xpcall','select','unpack','rawget','rawset','setmetatable','getmetatable','next','assert','collectgarbage','coroutine','debug','load','loadfile','dofile'],
    types: ['nil','boolean','number','string','function','userdata','thread','table']
  },
  r: {
    keywords: ['if','else','repeat','while','function','for','in','next','break','TRUE','FALSE','NULL','Inf','NaN','NA','return','switch','tryCatch','stop','warning','message','cat','print','paste','paste0','sprintf','library','require','source','data','c','list','vector','matrix','array','factor','data.frame','which','apply','sapply','lapply','tapply','mapply','Reduce','Filter','Map','do.call','on.exit','sys.call','match.arg','missing','exists','is.null','is.na','is.numeric','is.character','is.logical','as.numeric','as.character','as.logical','length','nrow','ncol','dim','names','class','typeof','str','summary','head','tail','seq','seq_along','seq_len','rep'],
    types: ['numeric','integer','character','logical','complex','raw','list','vector','matrix','data.frame','factor','NULL','NA','Inf','NaN','environment','formula']
  },
  perl: {
    keywords: ['my','our','local','sub','if','elsif','else','unless','while','until','for','foreach','do','return','last','next','redo','goto','use','require','package','BEGIN','END','print','say','die','warn','chomp','chop','push','pop','shift','unshift','splice','join','split','sort','reverse','map','grep','keys','values','exists','delete','defined','undef','ref','bless','open','close','read','write','seek','tell','eof','binmode','tie','untie','tied','scalar','wantarray','caller','eval','exec','system','qw','qq','qx','qr','tr','y','s','m'],
    types: ['SCALAR','ARRAY','HASH','CODE','REF','GLOB','LVALUE','FORMAT','IO','VSTRING','Regexp']
  },
  bash: {
    keywords: ['if','then','else','elif','fi','case','esac','for','while','until','do','done','in','function','return','exit','local','export','readonly','declare','typeset','unset','shift','set','source','alias','unalias','echo','printf','read','test','eval','exec','trap','wait','true','false','break','continue','select','time','coproc','let','getopts','cd','pwd','pushd','popd','dirs','ls','cp','mv','rm','mkdir','rmdir','touch','cat','head','tail','grep','sed','awk','find','sort','uniq','wc','cut','tr','tee','xargs','chmod','chown','chgrp','kill','ps','bg','fg','jobs','nohup','disown','pipe','sudo','apt','yum','dnf','pacman','brew'],
    types: []
  },
  sql: {
    keywords: ['SELECT','FROM','WHERE','INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','TABLE','ALTER','DROP','INDEX','VIEW','JOIN','INNER','LEFT','RIGHT','OUTER','FULL','CROSS','ON','AND','OR','NOT','IN','BETWEEN','LIKE','IS','NULL','AS','ORDER','BY','GROUP','HAVING','DISTINCT','UNION','ALL','EXISTS','CASE','WHEN','THEN','ELSE','END','LIMIT','OFFSET','FETCH','TOP','GRANT','REVOKE','COMMIT','ROLLBACK','SAVEPOINT','BEGIN','TRANSACTION','WITH','RECURSIVE','RETURNING','UPSERT','MERGE','TRUNCATE','CASCADE','CONSTRAINT','PRIMARY','KEY','FOREIGN','REFERENCES','UNIQUE','CHECK','DEFAULT','AUTO_INCREMENT','SERIAL','IDENTITY','IF','PROCEDURE','FUNCTION','TRIGGER','DECLARE','CURSOR','OPEN','CLOSE','DEALLOCATE','EXEC','EXECUTE'],
    types: ['INT','INTEGER','BIGINT','SMALLINT','TINYINT','FLOAT','DOUBLE','DECIMAL','NUMERIC','REAL','CHAR','VARCHAR','TEXT','NCHAR','NVARCHAR','NTEXT','DATE','TIME','DATETIME','TIMESTAMP','BOOLEAN','BLOB','CLOB','JSON','XML','UUID','SERIAL','MONEY','BIT','BINARY','VARBINARY','INTERVAL','ARRAY','ENUM','POINT','POLYGON','GEOMETRY']
  },
  dart: {
    keywords: ['abstract','as','assert','async','await','break','case','catch','class','const','continue','covariant','default','deferred','do','dynamic','else','enum','export','extends','extension','external','factory','false','final','finally','for','Function','get','hide','if','implements','import','in','interface','is','late','library','mixin','new','null','on','operator','part','required','rethrow','return','set','show','static','super','switch','sync','this','throw','true','try','typedef','var','void','while','with','yield'],
    types: ['int','double','num','String','bool','List','Map','Set','Future','Stream','Iterable','dynamic','void','Object','Null','Symbol','Type','Function','Never']
  },
  scala: {
    keywords: ['abstract','case','catch','class','def','do','else','extends','false','final','finally','for','forSome','if','implicit','import','lazy','match','new','null','object','override','package','private','protected','return','sealed','super','this','throw','trait','true','try','type','val','var','while','with','yield','enum','given','using','then','end','export','derives'],
    types: ['Int','Long','Short','Byte','Float','Double','Boolean','Char','String','Any','AnyVal','AnyRef','Unit','Nothing','Null','Option','Some','None','List','Map','Set','Seq','Vector','Array','Tuple','Either','Left','Right','Future','Try','Success','Failure']
  },
  haskell: {
    keywords: ['module','where','import','qualified','as','hiding','data','type','newtype','class','instance','deriving','if','then','else','case','of','let','in','do','return','where','infixl','infixr','infix','forall','foreign','default','True','False','Nothing','Just','Left','Right','otherwise','not','and','or','map','filter','foldr','foldl','head','tail','null','length','reverse','take','drop','zip','unzip','show','read','print','putStrLn','getLine','pure','undefined','error'],
    types: ['Int','Integer','Float','Double','Bool','Char','String','Maybe','Either','IO','Ordering','Eq','Ord','Show','Read','Num','Integral','Fractional','Floating','Enum','Bounded','Functor','Applicative','Monad','Monoid','Semigroup','Foldable','Traversable']
  },
  elixir: {
    keywords: ['def','defp','defmodule','defmacro','defmacrop','defstruct','defprotocol','defimpl','defdelegate','defguard','defexception','defoverridable','do','end','if','else','unless','case','cond','when','with','for','fn','raise','rescue','catch','after','try','throw','receive','send','spawn','import','require','use','alias','quote','unquote','true','false','nil','and','or','not','in','is_atom','is_binary','is_boolean','is_float','is_function','is_integer','is_list','is_map','is_nil','is_number','is_pid','is_tuple'],
    types: ['String','Integer','Float','Atom','List','Tuple','Map','MapSet','Keyword','Range','Regex','Port','PID','Reference','Function','Stream','Enum','IO','File','Path','System','Task','Agent','GenServer','Supervisor']
  },
  clojure: {
    keywords: ['def','defn','defn-','defmacro','defmulti','defmethod','defprotocol','defrecord','defstruct','deftype','fn','if','when','when-not','when-let','cond','condp','case','do','let','loop','recur','for','doseq','dotimes','while','try','catch','finally','throw','and','or','not','nil','true','false','ns','require','use','import','in-ns','refer','quote','unquote','syntax-quote','deref','atom','swap!','reset!','compare-and-set!','add-watch','remove-watch','agent','send','send-off','await','future','promise','deliver','map','filter','reduce','apply','partial','comp','juxt','complement','identity','constantly','memoize','assoc','dissoc','merge','get','get-in','assoc-in','update-in','conj','cons','first','rest','next','seq','into','count','empty?','nil?','some?','every?','println','prn','str','format','name','keyword','symbol','type','class','instance?'],
    types: []
  },
  zig: {
    keywords: ['align','allowzero','and','anyframe','anytype','asm','async','await','break','callconv','catch','comptime','const','continue','defer','else','enum','errdefer','error','export','extern','false','fn','for','if','inline','linksection','noalias','nosuspend','null','opaque','or','orelse','packed','pub','resume','return','struct','suspend','switch','test','threadlocal','true','try','undefined','union','unreachable','var','volatile','while'],
    types: ['i8','i16','i32','i64','i128','u8','u16','u32','u64','u128','f16','f32','f64','f80','f128','bool','void','noreturn','type','anyerror','anytype','comptime_int','comptime_float','usize','isize','c_int','c_uint','c_long','c_ulong']
  },
  julia: {
    keywords: ['function','end','if','elseif','else','for','while','return','break','continue','begin','let','do','try','catch','finally','throw','macro','module','baremodule','using','import','export','const','global','local','abstract','type','struct','mutable','primitive','where','in','isa','true','false','nothing','missing','println','print','typeof','sizeof','isa','convert','parse','string','collect','map','filter','reduce','push!','pop!','append!','sort!','reverse!','length','size','zeros','ones','rand','randn','range','enumerate','zip'],
    types: ['Int8','Int16','Int32','Int64','Int128','UInt8','UInt16','UInt32','UInt64','UInt128','Float16','Float32','Float64','BigInt','BigFloat','Bool','Char','String','Symbol','Tuple','NamedTuple','Array','Vector','Matrix','Dict','Set','Nothing','Missing','Any','Number','Integer','AbstractFloat','Real','Complex','Rational','IO','IOBuffer','Regex','Type','Function','Module','Expr','LineNumberNode']
  }
};

// Aliases
langDefs['c-header'] = langDefs.c;
langDefs.tsx = langDefs.typescript;
langDefs.jsx = langDefs.typescript;
langDefs.powershell = langDefs.bash;
langDefs.nim = { keywords: ['proc','func','method','template','macro','iterator','converter','type','object','enum','concept','var','let','const','if','elif','else','when','case','of','for','while','block','break','continue','return','yield','discard','import','include','from','export','except','try','except','finally','raise','defer','do','end','and','or','not','xor','shl','shr','div','mod','in','notin','is','isnot','nil','true','false','result','echo','assert','quit','debugEcho'], types: ['int','int8','int16','int32','int64','uint','uint8','uint16','uint32','uint64','float','float32','float64','bool','char','string','seq','array','openArray','set','tuple','object','ref','ptr','pointer','cstring','void','auto','any','typedesc','Natural','Positive','Ordinal','SomeInteger','SomeFloat','SomeNumber','range','Slice','HSlice'] };
langDefs.v = { keywords: ['fn','struct','enum','interface','union','module','import','pub','mut','shared','const','type','if','else','for','in','or','match','return','break','continue','go','spawn','defer','assert','unsafe','sql','lock','rlock','select','none','true','false','is','as','it','println','print','eprintln','dump','typeof','sizeof','isnil'], types: ['int','i8','i16','i32','i64','u8','u16','u32','u64','f32','f64','bool','byte','string','rune','voidptr','byteptr','charptr','any','map','array','chan','thread','none'] };
langDefs.ocaml = { keywords: ['let','rec','in','if','then','else','match','with','when','fun','function','begin','end','type','of','module','struct','sig','functor','open','include','val','external','exception','raise','try','assert','for','to','downto','do','done','while','and','or','not','mod','land','lor','lxor','lsl','lsr','asr','true','false','as','mutable','ref','method','object','class','inherit','initializer','constraint','virtual','private','new','lazy'], types: ['int','float','char','string','bool','unit','list','array','option','result','ref','bytes','exn','format'] };
langDefs.fsharp = { keywords: ['let','rec','mutable','in','if','then','elif','else','match','with','when','fun','function','begin','end','type','of','module','open','namespace','do','for','to','downto','while','yield','return','true','false','and','or','not','as','try','with','finally','raise','use','inline','static','member','override','abstract','default','val','new','interface','inherit','base','upcast','downcast','async','task','printf','printfn','sprintf','failwith','ignore'], types: ['int','int64','float','float32','decimal','char','string','bool','unit','byte','sbyte','int16','uint16','uint32','uint64','nativeint','unativeint','bigint','list','array','seq','option','voption','result','Map','Set','Async','Task','obj','exn'] };
langDefs.lisp = { keywords: ['defun','defvar','defparameter','defconstant','defmacro','defmethod','defclass','defstruct','defgeneric','defpackage','lambda','let','let*','setq','setf','if','when','unless','cond','case','typecase','progn','prog1','prog2','block','return','return-from','tagbody','go','loop','do','do*','dolist','dotimes','mapcar','mapc','mapcan','apply','funcall','eval','quote','function','and','or','not','eq','eql','equal','equalp','null','atom','listp','numberp','symbolp','stringp','consp','car','cdr','cons','list','append','nconc','reverse','nreverse','length','nth','first','rest','last','print','format','read','write','values','multiple-value-bind','handler-case','handler-bind','restart-case','error','warn','signal','assert','check-type','in-package','use-package','export','import','shadow','intern','find-symbol','make-instance','slot-value','with-slots','with-accessors','initialize-instance','t','nil'], types: ['fixnum','bignum','ratio','float','short-float','single-float','double-float','long-float','complex','number','integer','rational','real','character','string','symbol','cons','list','vector','array','hash-table','package','pathname','stream','function','class','standard-object','structure-object','condition','restart','readtable','random-state','method','t','nil','boolean','bit','unsigned-byte','signed-byte','base-char','standard-char','extended-char','sequence'] };
langDefs.erlang = { keywords: ['after','begin','case','catch','cond','end','fun','if','let','of','query','receive','try','when','andalso','band','bnot','bor','bsl','bsr','bxor','div','not','or','orelse','rem','xor','true','false','ok','error','undefined','module','export','import','compile','define','include','include_lib','ifdef','ifndef','else','endif','undef','record','type','spec','callback','opaque','behaviour','behavior','on_load','vsn','author','file'], types: ['integer','float','number','atom','binary','bitstring','boolean','byte','char','iodata','iolist','list','map','mfa','module','nil','node','none','nonempty_list','nonempty_string','non_neg_integer','pid','port','pos_integer','reference','string','term','timeout','tuple','function','pid','port','reference'] };
langDefs.assembly = { keywords: ['mov','add','sub','mul','div','jmp','je','jne','jz','jnz','jg','jl','jge','jle','ja','jb','jae','jbe','call','ret','push','pop','nop','int','syscall','lea','cmp','test','and','or','xor','not','shl','shr','sar','sal','rol','ror','inc','dec','neg','imul','idiv','cbw','cwd','cdq','movzx','movsx','rep','movsb','movsw','movsd','stosb','stosw','stosd','cmpsb','cmpsw','cmpsd','loop','loope','loopne','enter','leave','hlt','cli','sti','clc','stc','cmc','cld','std','lahf','sahf','pushf','popf','in','out','xchg','bswap','bt','bts','btr','btc','bsf','bsr','cmov','sete','setne','setg','setl','setge','setle','section','global','extern','db','dw','dd','dq','resb','resw','resd','resq','equ','times','align'], types: ['eax','ebx','ecx','edx','esi','edi','esp','ebp','rax','rbx','rcx','rdx','rsi','rdi','rsp','rbp','r8','r9','r10','r11','r12','r13','r14','r15','ax','bx','cx','dx','al','ah','bl','bh','cl','ch','dl','dh','cs','ds','es','fs','gs','ss','eflags','rflags','xmm0','xmm1','xmm2','xmm3','xmm4','xmm5','xmm6','xmm7','ymm0','ymm1','ymm2','ymm3','ymm4','ymm5','ymm6','ymm7'] };
langDefs.yaml = { keywords: ['true','false','null','yes','no','on','off'], types: [] };
langDefs.toml = { keywords: ['true','false'], types: [] };
langDefs.json = { keywords: ['true','false','null'], types: [] };
langDefs.markdown = { keywords: [], types: [] };
langDefs.config = langDefs.toml;
langDefs.dockerfile = { keywords: ['FROM','RUN','CMD','LABEL','MAINTAINER','EXPOSE','ENV','ADD','COPY','ENTRYPOINT','VOLUME','USER','WORKDIR','ARG','ONBUILD','STOPSIGNAL','HEALTHCHECK','SHELL','AS'], types: [] };
langDefs.makefile = { keywords: ['all','clean','install','uninstall','test','check','dist','distclean','mostlyclean','maintainer-clean','FORCE','PHONY','SUFFIXES','DEFAULT','PRECIOUS','INTERMEDIATE','SECONDARY','SECONDEXPANSION','DELETE_ON_ERROR','IGNORE','LOW_RESOLUTION_TIME','SILENT','EXPORT_ALL_VARIABLES','NOTPARALLEL','ONESHELL','POSIX','include','ifdef','ifndef','ifeq','ifneq','else','endif','define','endef','override','unexport','vpath','export'], types: [] };
langDefs.terraform = { keywords: ['resource','data','variable','output','locals','module','provider','terraform','required_providers','required_version','backend','provisioner','connection','lifecycle','dynamic','for_each','count','depends_on','source','version','type','default','description','sensitive','validation','condition','error_message','true','false','null'], types: ['string','number','bool','list','map','set','object','tuple','any'] };
langDefs.protobuf = { keywords: ['syntax','import','package','option','message','enum','service','rpc','returns','oneof','map','repeated','required','optional','reserved','extensions','extend','to','max','true','false','stream'], types: ['double','float','int32','int64','uint32','uint64','sint32','sint64','fixed32','fixed64','sfixed32','sfixed64','bool','string','bytes'] };
langDefs.graphql = { keywords: ['type','input','enum','interface','union','scalar','schema','query','mutation','subscription','fragment','on','directive','extend','implements','repeatable','true','false','null'], types: ['Int','Float','String','Boolean','ID'] };
langDefs.gradle = langDefs.kotlin;
langDefs.cmake = { keywords: ['cmake_minimum_required','project','add_executable','add_library','target_link_libraries','target_include_directories','find_package','include_directories','set','option','if','elseif','else','endif','foreach','endforeach','while','endwhile','function','endfunction','macro','endmacro','return','message','install','configure_file','add_custom_command','add_custom_target','add_subdirectory','include','list','string','file','get_filename_component','execute_process','add_definitions','add_compile_options','target_compile_options','target_compile_definitions','set_target_properties','get_target_property','cmake_policy','enable_testing','add_test','TRUE','FALSE','ON','OFF','YES','NO'], types: [] };

function highlightCode(code, type) {
  var def = langDefs[type];
  if (!def) return code;

  // Comments (// and # style)
  if (['python','ruby','perl','bash','powershell','r','yaml','toml','config','makefile','cmake','nim','julia','elixir','v'].indexOf(type) !== -1) {
    code = code.replace(/(#[^\n]*)/g, '<span class="cm">$1</span>');
  } else if (['haskell'].indexOf(type) !== -1) {
    code = code.replace(/(--[^\n]*)/g, '<span class="cm">$1</span>');
  } else if (['lua','sql'].indexOf(type) !== -1) {
    code = code.replace(/(--[^\n]*)/g, '<span class="cm">$1</span>');
  } else if (['lisp','clojure'].indexOf(type) !== -1) {
    code = code.replace(/(;[^\n]*)/g, '<span class="cm">$1</span>');
  } else if (type === 'assembly') {
    code = code.replace(/(;[^\n]*)/g, '<span class="cm">$1</span>');
  } else {
    code = code.replace(/(\/\/[^\n]*)/g, '<span class="cm">$1</span>');
  }

  // Strings
  code = code.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="str">$1</span>');
  code = code.replace(/(&#39;(?:[^&]|&(?!#39;))*?&#39;)/g, '<span class="str">$1</span>');

  // Macros for Rust
  if (def.hasMacros) {
    code = code.replace(/\b([a-z_]+!)/g, '<span class="mac">$1</span>');
  }

  // Keywords (case-insensitive for SQL)
  var kwFlags = (type === 'sql') ? 'gi' : 'g';
  if (def.keywords.length > 0) {
    def.keywords.forEach(function(kw) {
      var escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      code = code.replace(new RegExp('\\b(' + escaped + ')\\b', kwFlags), '<span class="kw">$1</span>');
    });
  }

  // Types
  if (def.types.length > 0) {
    def.types.forEach(function(ty) {
      var escaped = ty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      code = code.replace(new RegExp('\\b(' + escaped + ')\\b', 'g'), '<span class="ty">$1</span>');
    });
  }

  // Numbers
  code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');

  // Function calls
  code = code.replace(/\b([a-z_][a-z0-9_]*)\s*\(/gi, function(match, name) {
    if (match.indexOf('<span') !== -1) return match;
    return '<span class="fn">' + name + '</span>(';
  });

  return code;
}

// --- Theme Toggle ---

function initTheme() {
  var saved = localStorage.getItem('codedrop-theme');
  var theme = saved || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
}

themeToggle.addEventListener('click', function() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('codedrop-theme', next);
});

initTheme();

// --- More Languages Toggle ---

var moreLangsBtn = document.getElementById('more-langs-btn');
var allLangsPanel = document.getElementById('all-langs-panel');

if (moreLangsBtn && allLangsPanel) {
  moreLangsBtn.addEventListener('click', function() {
    var isOpen = allLangsPanel.style.display !== 'none';
    allLangsPanel.style.display = isOpen ? 'none' : 'block';
    moreLangsBtn.textContent = isOpen ? '+ 40 more' : 'Show less';
  });
}

// --- Boot: check for shared site ---
checkForSharedSite();
