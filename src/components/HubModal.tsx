import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { X, Send, AlertTriangle } from 'lucide-react';

interface HubModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    title: string;
    placeholder: string;
    confirmText?: string;
    icon?: React.ReactNode;
}

export function HubModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    placeholder, 
    confirmText = "Submit Report",
    icon = <AlertTriangle className="text-primary" size={24} />
}: HubModalProps) {
    const [value, setValue] = useState('');

    useEffect(() => {
        if (isOpen) setValue('');
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-md" 
                onClick={onClose}
            />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-card border border-white/10 rounded-[32px] p-8 shadow-2xl shadow-primary/10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-xl hover:bg-white/5 text-muted-foreground transition-all"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                        {icon}
                    </div>
                    
                    <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-2">{title}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-8 opacity-40">
                        Please provide details to help our moderators.
                    </p>
                    
                    <div className="w-full relative group mb-8">
                        <textarea 
                            autoFocus
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={placeholder}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-medium outline-none transition-all focus:border-primary/40 focus:bg-white/10 min-h-[120px] resize-none"
                        />
                    </div>

                    <div className="flex w-full gap-4">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl bg-white/5 text-muted-foreground font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                if (value.trim()) {
                                    onConfirm(value);
                                    onClose();
                                }
                            }}
                            disabled={!value.trim()}
                            className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all flex items-center justify-center gap-2"
                        >
                            <Send size={14} />
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
