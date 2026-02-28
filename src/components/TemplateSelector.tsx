'use client';

import type { PromptTemplate } from '@/types';

interface Template {
  id: PromptTemplate;
  name: string;
  description: string;
  icon: string;
}

const TEMPLATES: Template[] = [
  { id: 'general',   name: 'General Assistant',         description: 'Any task or question',              icon: '✨' },
  { id: 'coding',    name: 'Coding Task',               description: 'Code gen, review & debugging',      icon: '💻' },
  { id: 'marketing', name: 'Marketing Copy',            description: 'Ads, emails & campaigns',           icon: '📣' },
  { id: 'meeting',   name: 'Meeting → Action Plan',     description: 'Turn notes into next steps',        icon: '📋' },
  { id: 'support',   name: 'Support → Troubleshooting', description: 'Debug issues systematically',       icon: '🔧' },
  { id: 'research',  name: 'Research Brief',            description: 'Structured research prompts',       icon: '🔬' },
];

interface TemplateSelectorProps {
  value: PromptTemplate;
  onChange: (template: PromptTemplate) => void;
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">Prompt Template</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {TEMPLATES.map((tpl) => {
          const selected = value === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onChange(tpl.id)}
              className={[
                'flex flex-col items-start gap-1 rounded-xl border p-3 text-left',
                'transition-all duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
                selected
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-400'
                  : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40',
              ].join(' ')}
            >
              <span className="text-xl leading-none">{tpl.icon}</span>
              <span className={['text-xs font-semibold leading-tight', selected ? 'text-indigo-800' : 'text-gray-800'].join(' ')}>
                {tpl.name}
              </span>
              <span className={['text-xs leading-tight', selected ? 'text-indigo-600' : 'text-gray-500'].join(' ')}>
                {tpl.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
