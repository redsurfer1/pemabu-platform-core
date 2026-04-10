'use client';

import { useState } from 'react';
import { Shield, Mail, Building, User, X } from 'lucide-react';

interface RequestInstitutionalAccessProps {
  onClose?: () => void;
}

export function RequestInstitutionalAccess({ onClose }: RequestInstitutionalAccessProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    role: '',
    reason: '',
  });

  const handleOpen = () => setIsOpen(true);

  const handleClose = () => {
    setIsOpen(false);
    setIsSuccess(false);
    setFormData({ name: '', email: '', organization: '', role: '', reason: '' });
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log('Institutional Access Request:', formData);

    setIsSuccess(true);
    setIsSubmitting(false);

    setTimeout(() => {
      handleClose();
    }, 3000);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <Shield className="w-4 h-4" />
        Request Institutional Access
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg max-w-2xl w-full shadow-2xl">
            <div className="border-b border-neutral-800 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-neutral-100 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-violet-400" />
                  Request Institutional Access
                </h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Access to the Trust Center for auditors, LLC members, and institutional stakeholders
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="bg-violet-950/20 border border-violet-900/30 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-violet-300 mb-2">Trust Center Access Levels</h3>
                  <ul className="text-xs text-neutral-400 space-y-1">
                    <li>• <strong className="text-violet-400">ADVISOR</strong>: Read-only access to compliance data and audit evidence</li>
                    <li>• <strong className="text-violet-400">USER</strong>: Full Trust Center visibility with governance rights</li>
                    <li>• <strong className="text-violet-400">ADMIN</strong>: Complete system access with control permissions</li>
                  </ul>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      <User className="w-3.5 h-3.5 inline mr-1" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200 placeholder-neutral-500 focus:border-violet-500 focus:outline-none transition-colors"
                      placeholder="Jane Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      <Mail className="w-3.5 h-3.5 inline mr-1" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200 placeholder-neutral-500 focus:border-violet-500 focus:outline-none transition-colors"
                      placeholder="jane@institution.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      <Building className="w-3.5 h-3.5 inline mr-1" />
                      Organization *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className="w-full px-4 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200 placeholder-neutral-500 focus:border-violet-500 focus:outline-none transition-colors"
                      placeholder="Audit Firm LLC"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Role / Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200 placeholder-neutral-500 focus:border-violet-500 focus:outline-none transition-colors"
                      placeholder="External Auditor"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Access Justification *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200 placeholder-neutral-500 focus:border-violet-500 focus:outline-none transition-colors resize-none"
                    placeholder="Please describe your role and why you need access to the Trust Center..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-neutral-700 disabled:to-neutral-700 text-white rounded-lg font-semibold transition-all duration-200 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting Request...' : 'Submit Request'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-neutral-300 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-100 mb-2">Request Submitted Successfully</h3>
                <p className="text-neutral-400 mb-6">
                  Our team will review your request and respond within 2-3 business days. You will receive an email at{' '}
                  <span className="text-violet-400 font-medium">{formData.email}</span> with further instructions.
                </p>
                <p className="text-xs text-neutral-500">
                  This window will close automatically...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
