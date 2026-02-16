// Arc Playground — Editor Component

(function() {
"use strict";

var textarea = document.getElementById("code-input");
var lineNumbers = document.getElementById("line-numbers");
var highlight = document.getElementById("code-highlight");

// Update line numbers
function updateLineNumbers() {
  var lines = textarea.value.split("\n").length;
  var nums = "";
  for (var i = 1; i <= lines; i++) nums += i + "\n";
  lineNumbers.textContent = nums;
}

// Syntax highlighting
function updateHighlight() {
  var code = textarea.value;
  var html = code
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Comments
    .replace(/(#[^\n]*)/g, '<span class="hl-comment">$1</span>')
    // Strings (simple, doesn't handle all edge cases but good enough)
    .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="hl-string">$1</span>')
    // Numbers
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>')
    // Keywords
    .replace(/\b(fn|let|mut|match|if|el|for|in|do|while|until|ret|and|or|not|true|false|nil|type|use|pub|async|await)\b/g, '<span class="hl-keyword">$1</span>')
    // Tool calls
    .replace(/(@\w+)/g, '<span class="hl-tool">$1</span>')
    // Operators
    .replace(/(\|&gt;|=&gt;|\.\.|\+\+|\*\*)/g, '<span class="hl-op">$1</span>');

  highlight.innerHTML = html + "\n";
}

function syncScroll() {
  highlight.scrollTop = textarea.scrollTop;
  highlight.scrollLeft = textarea.scrollLeft;
  lineNumbers.scrollTop = textarea.scrollTop;
}

// Tab key
textarea.addEventListener("keydown", function(e) {
  if (e.key === "Tab") {
    e.preventDefault();
    var start = this.selectionStart;
    var end = this.selectionEnd;
    this.value = this.value.substring(0, start) + "  " + this.value.substring(end);
    this.selectionStart = this.selectionEnd = start + 2;
    updateLineNumbers();
    updateHighlight();
  }

  // Ctrl+Enter to run
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    document.getElementById("run-btn").click();
  }

  // Auto-indent after {
  if (e.key === "Enter") {
    var pos = this.selectionStart;
    var before = this.value.substring(0, pos);
    var after = this.value.substring(pos);
    var lastLine = before.split("\n").pop();
    var indent = lastLine.match(/^(\s*)/)[1];
    if (before.trimRight().endsWith("{")) {
      indent += "  ";
    }
    // Don't prevent default — let the enter happen, then we'll adjust
    // Actually, we need to handle it ourselves for proper indenting
    e.preventDefault();
    var insert = "\n" + indent;
    this.value = before + insert + after;
    this.selectionStart = this.selectionEnd = pos + insert.length;
    updateLineNumbers();
    updateHighlight();
  }
});

textarea.addEventListener("input", function() {
  updateLineNumbers();
  updateHighlight();
});
textarea.addEventListener("scroll", syncScroll);

// Initialize
window.editorInit = function() {
  updateLineNumbers();
  updateHighlight();
};

window.editorSetCode = function(code) {
  textarea.value = code;
  updateLineNumbers();
  updateHighlight();
};

window.editorGetCode = function() {
  return textarea.value;
};

})();
