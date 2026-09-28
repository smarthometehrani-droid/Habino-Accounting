import React from 'react';
import { FormCompositeGroup, FormFieldLeaf, FormNode } from '../lib/formBuilderComposite';
import { IGuildFormStrategy } from '../lib/guildFormStrategy';
import { Layers, Info, Check } from 'lucide-react';

interface DynamicGuildFormSectionProps {
  strategy: IGuildFormStrategy;
  compositeGroup: FormCompositeGroup;
  values: Record<string, any>;
  onChange: (updatedValues: Record<string, any>) => void;
  compact?: boolean;
}

export const DynamicGuildFormSection: React.FC<DynamicGuildFormSectionProps> = ({
  strategy,
  compositeGroup,
  values,
  onChange,
  compact = false
}) => {
  const handleLeafChange = (fieldName: string, value: any) => {
    const updated = { ...values, [fieldName]: value };
    onChange(updated);
  };

  const renderNode = (node: FormNode) => {
    if (node instanceof FormFieldLeaf) {
      const leaf = node;
      const currentValue = values[leaf.name] ?? leaf.defaultValue ?? '';

      return (
        <div key={leaf.id} className="space-y-1">
          <label className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span>{leaf.label}</span>
            {leaf.unit && (
              <span className="text-[10px] font-mono font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                {leaf.unit}
              </span>
            )}
          </label>

          {leaf.fieldType === 'select' ? (
            <select
              value={currentValue}
              onChange={e => handleLeafChange(leaf.name, e.target.value)}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
            >
              {leaf.options?.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : leaf.fieldType === 'number' ? (
            <input
              type="number"
              value={currentValue}
              onChange={e => handleLeafChange(leaf.name, e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={leaf.placeholder || '۰'}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          ) : leaf.fieldType === 'textarea' ? (
            <textarea
              value={currentValue}
              onChange={e => handleLeafChange(leaf.name, e.target.value)}
              placeholder={leaf.placeholder}
              rows={2}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 resize-none"
            />
          ) : (
            <input
              type="text"
              value={currentValue}
              onChange={e => handleLeafChange(leaf.name, e.target.value)}
              placeholder={leaf.placeholder}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          )}

          {leaf.description && (
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{leaf.description}</p>
          )}
        </div>
      );
    }

    if (node instanceof FormCompositeGroup) {
      return (
        <div key={node.id} className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">{node.label}</span>
            </div>
            {node.badge && (
              <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                {node.badge}
              </span>
            )}
          </div>
          {node.description && (
            <p className="text-[11px] text-slate-500">{node.description}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {node.getChildren().map(child => renderNode(child))}
          </div>
        </div>
      );
    }

    return null;
  };

  const children = compositeGroup.getChildren();
  if (children.length === 0) return null;

  return (
    <div className={`space-y-3 ${compact ? 'text-xs' : ''}`}>
      <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200/70 p-2.5 rounded-xl">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">{compositeGroup.label}</span>
              <span className="text-[10px] font-semibold bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                {strategy.badge}
              </span>
            </div>
            {compositeGroup.description && (
              <p className="text-[11px] text-slate-500 mt-0.5">{compositeGroup.description}</p>
            )}
          </div>
        </div>
        <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1 font-medium">
          <Check className="w-3 h-3 text-emerald-600" />
          ذخیره خودکار در متادیتا (JSONB)
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
        {children.map(child => renderNode(child))}
      </div>
    </div>
  );
};
