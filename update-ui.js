const fs = require('fs');
const file = 'components/snack-dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Layouts
content = content.replace(/className="page"/g, 'className="max-w-lg mx-auto p-4 space-y-6 pb-24"');
content = content.replace(/className="hero"/g, 'className="glass-card rounded-2xl p-5 md:p-6 mb-6 text-center shadow-sm"');
content = content.replace(/className="grid two"/g, 'className="grid md:grid-cols-2 gap-4"');
content = content.replace(/className="panel"/g, 'className="glass-card rounded-2xl p-4 space-y-4 shadow-sm relative"');
content = content.replace(/className="row two"/g, 'className="grid grid-cols-2 gap-3"');
content = content.replace(/className="row three"/g, 'className="grid md:grid-cols-3 grid-cols-2 gap-3"');
content = content.replace(/className="inline-actions"/g, 'className="flex flex-wrap items-center gap-2"');
content = content.replace(/className="cards"/g, 'className="grid grid-cols-2 gap-3"');
content = content.replace(/className="metric"/g, 'className="glass-card rounded-xl p-3 text-center border border-gray-100"');
content = content.replace(/className="list"/g, 'className="space-y-3"');
content = content.replace(/className="list-item"/g, 'className="border border-primary-200 rounded-xl p-3 bg-white"');

// Texts
content = content.replace(/className="muted"/g, 'className="text-sm text-text-muted"');
content = content.replace(/className="danger"/g, 'className="text-sm font-bold text-red-500"');
content = content.replace(/className="success-text"/g, 'className="text-sm font-bold text-green-600"');
content = content.replace(/className="value"/g, 'className="text-2xl font-bold text-primary-600"');
content = content.replace(/className="label"/g, 'className="text-xs text-text-secondary mt-1"');

// Inputs
content = content.replace(/<input /g, '<input className="input-field" ');
content = content.replace(/<select /g, '<select className="input-field" ');
content = content.replace(/<textarea /g, '<textarea className="input-field min-h-[80px]" ');
content = content.replace(/className="input-field" className="/g, 'className="input-field ');
content = content.replace(/className="input-field" type="date"/g, 'type="date" className="input-field"');

// Form Buttons
content = content.replace(/className="primary"/g, 'className="btn-primary w-full"');
content = content.replace(/className="secondary"/g, 'className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"');
content = content.replace(/className="success"/g, 'className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95"');
content = content.replace(/<button onClick/g, '<button className="btn-primary" onClick');
content = content.replace(/<button type="button" onClick/g, '<button type="button" className="btn-primary" onClick');

fs.writeFileSync(file, content);
