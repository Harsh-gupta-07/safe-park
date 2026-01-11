"use client";

import { HelpCircle, Pencil } from "lucide-react";

export default function SettingsFAQ({ setActiveView }) {
    const user = {
        name: "John Doe",
        phone: "+91 98765 43210",
        initial: "J",
    };

    const faqs = [
        {
            id: 1,
            question: "How do I add a vehicle?",
            answer: 'Go to the "Manage Vehicles" section and click "Add New Vehicle".',
        },
        {
            id: 2,
            question: "How do I remove a vehicle?",
            answer: 'Go to the "Manage Vehicles" section and click "Remove" next to the vehicle you want to delete.',
        },
        {
            id: 3,
            question: "How do I manage payment methods?",
            answer: 'Go to the "Payment Methods" section and add or remove payment options.',
        },
        {
            id: 4,
            question: "How do I view transaction history?",
            answer: 'Go to the "Transaction History" section to view all your payments.',
        },
    ];

    return (
        <div className="px-6 mt-6">

            <div className="space-y-3">
                {faqs.map((faq) => (
                    <div
                        key={faq.id}
                        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4"
                    >
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <HelpCircle size={20} className="text-slate-500" />
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-900 mb-1">{faq.question}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{faq.answer}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}