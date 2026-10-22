import React, { useState, useEffect } from 'react';
import {
  FileText, Upload, CheckCircle2, AlertTriangle, XCircle, Clock,
  FileCheck, Sparkles, Hash, Edit3, Download, Eye, RefreshCw, Plus,
  ShieldCheck, AlertCircle, ChevronRight
} from 'lucide-react';
import {
  DocumentItem, DocumentCategory, DocumentVerificationStatus,
  ExtractedDocumentField, Application
} from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const DocumentsView: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [editingField, setEditingField] = useState<ExtractedDocumentField | null>(null);
  const [correctedValue, setCorrectedValue] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Upload Form states
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('LAND_AND_BUILDING');
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const apps = await api.getApplications();
      setApplications(apps);
      if (apps.length > 0) {
        const appId = apps[0].id;
        setSelectedAppId(appId);
        const docs = await api.getDocuments(appId);
        setDocuments(docs);
        if (docs.length > 0 && !selectedDoc) {
          setSelectedDoc(docs[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load documents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('application_id', selectedAppId.toString());
    formData.append('category', uploadCategory);
    formData.append('title', uploadTitle || selectedFile.name);
    formData.append('file', selectedFile);

    try {
      const newDoc = await api.uploadDocument(formData);
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadTitle('');
      const docs = await api.getDocuments(selectedAppId);
      setDocuments(docs);
      setSelectedDoc(newDoc);
    } catch (e: any) {
      alert(`Upload error: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerify = async (status: DocumentVerificationStatus) => {
    if (!selectedDoc) return;
    try {
      const updated = await api.verifyDocument(selectedDoc.id, status, verificationNotes);
      setVerificationNotes('');
      const docs = await api.getDocuments(selectedAppId);
      setDocuments(docs);
      setSelectedDoc(updated);
    } catch (e: any) {
      alert(`Verification error: ${e.message}`);
    }
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField) return;
    try {
      await api.correctField(editingField.id, correctedValue);
      setShowCorrectionModal(false);
      const docs = await api.getDocuments(selectedAppId);
      setDocuments(docs);
      if (selectedDoc) {
        const updated = docs.find(d => d.id === selectedDoc.id);
        if (updated) setSelectedDoc(updated);
      }
    } catch (e: any) {
      alert(`Correction error: ${e.message}`);
    }
  };

  const getStatusBadge = (status: DocumentVerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified Evidence</span>;
      case 'CORRECTION_REQUESTED':
        return <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Correction Requested</span>;
      case 'REJECTED':
        return <span className="bg-rose-900/40 text-rose-300 border border-rose-700 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="bg-sky-500/15 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Awaiting Review</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            AI Document Intelligence & Verification Workbench
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            PyMuPDF OCR extraction, SHA-256 deduplication, split-screen evidence verification & human-in-the-loop review
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Institutional Evidence</span>
        </button>
      </div>

      {/* Split Screen Workbench Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Documents List */}
        <div className="lg:col-span-4 bg-surface-card border border-surface-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Uploaded Evidence ({documents.length})
              </h2>
              <span className="text-[10px] text-slate-500 font-mono">SHA-256 Verified</span>
            </div>

            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500/50 shadow-md shadow-sky-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-200 line-clamp-1">{doc.title}</div>
                      <span className="text-[10px] font-mono text-cyan-400 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                        v{doc.version}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{doc.category.replace(/_/g, ' ')}</span>
                      <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      {getStatusBadge(doc.verification_status)}
                      <span className="text-[10px] font-mono text-slate-500 truncate max-w-[90px]">
                        {doc.sha256_hash.substring(0, 8)}...
                      </span>
                    </div>
                  </div>
                );
              })}

              {documents.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No documents uploaded yet. Click "Upload Institutional Evidence".
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Split Screen Side-by-Side Reviewer Workbench */}
        <div className="lg:col-span-8 bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm space-y-5">
          {selectedDoc ? (
            <>
              {/* Document Banner & Verification Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{selectedDoc.title}</h2>
                    {getStatusBadge(selectedDoc.verification_status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>File: {selectedDoc.file_name}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-500">Hash: {selectedDoc.sha256_hash.substring(0, 16)}...</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/api/v1/documents/${selectedDoc.id}/download`}
                    download
                    className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                    title="Download Original"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              </div>

              {/* Side-by-side Evidence Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Panel 1: Original Document Text / OCR Evidence Snippet */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        Original OCR Text Extracted
                      </span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
                        PyMuPDF Confidence: {(selectedDoc.ocr_confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {selectedDoc.ocr_text || 'No text extracted from document.'}
                    </div>
                  </div>

                  {selectedDoc.expiry_date && (
                    <div className="mt-3 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg flex items-center gap-2 text-xs text-amber-300">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="font-semibold">Expiry Date Detected: </span>
                        <span>{new Date(selectedDoc.expiry_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Panel 2: Structured Compliance Fields & Confidence Score */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        Structured Regulatory Fields
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {selectedDoc.extracted_fields?.length || 0} Fields Extracted
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {(selectedDoc.extracted_fields || []).map((field) => (
                        <div
                          key={field.id}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-cyan-400 font-semibold text-[11px]">
                              {field.field_name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-slate-400">
                                Conf: {(field.confidence_score * 100).toFixed(0)}%
                              </span>
                              <button
                                onClick={() => {
                                  setEditingField(field);
                                  setCorrectedValue(field.corrected_value || field.extracted_value);
                                  setShowCorrectionModal(true);
                                }}
                                className="p-1 text-slate-400 hover:text-sky-300"
                                title="Manually correct value"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="text-slate-200 font-medium bg-slate-950 px-2 py-1 rounded border border-slate-800/80">
                            {field.corrected_value ? (
                              <div>
                                <span className="text-emerald-400">{field.corrected_value}</span>
                                <span className="text-[9px] text-slate-500 ml-1.5">(Corrected)</span>
                              </div>
                            ) : (
                              field.extracted_value
                            )}
                          </div>

                          {field.raw_snippet && (
                            <p className="text-[10px] text-slate-500 italic line-clamp-1">
                              Match: "{field.raw_snippet}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reviewer Verification Toolbar */}
                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 block">
                      Reviewer Sign-off Action (Enforces Compliance Validity):
                    </span>
                    <input
                      type="text"
                      placeholder="Verification notes or discrepancy reason..."
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-sky-500"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleVerify('VERIFIED')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verify Evidence</span>
                      </button>
                      <button
                        onClick={() => handleVerify('CORRECTION_REQUESTED')}
                        className="bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-medium px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Request Correction</span>
                      </button>
                      <button
                        onClick={() => handleVerify('REJECTED')}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Verification Notes History */}
              {selectedDoc.verification_notes && (
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs space-y-1">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    Reviewer Verification Audit Comment
                  </div>
                  <p className="text-slate-400 italic">"{selectedDoc.verification_notes}"</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24 text-slate-500 text-xs">
              Select a document from the left list to inspect OCR extracted fields and evidence.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Upload Document */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">Upload Regulatory Evidence</h2>
            <p className="text-xs text-slate-400 mb-4">Files will be verified for SHA-256 duplicate detection and analyzed via PyMuPDF OCR.</p>

            <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Compliance Document Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs"
                >
                  <option value="LAND_AND_BUILDING">Land Title Deed & Campus Norms</option>
                  <option value="FACULTY_AND_STAFF">Faculty Roll, Cadre & Qualification Proofs</option>
                  <option value="FIRE_AND_SAFETY">Fire Safety Certificate (State Fire NOC)</option>
                  <option value="AFFILIATION_AND_ACCREDITATION">University Affiliation Order / NBA / NAAC</option>
                  <option value="FINANCIAL_AND_AUDIT">Audited Balance Sheet & Joint FD Receipt</option>
                  <option value="GOVERNING_BODY">Governing Body Minutes & Anti-Ragging</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Document Title / Description</label>
                <input
                  type="text"
                  placeholder="e.g. DDA Registered Freehold Land Title Deed"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Select File (PDF, DOCX, PNG, JPG - Max 25MB)</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:bg-sky-600 file:text-white file:text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="bg-primary hover:bg-primary-hover text-white font-semibold px-4 py-1.5 rounded-lg flex items-center gap-1.5"
                >
                  {isUploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUploading ? 'Extracting OCR...' : 'Upload & Process'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manual Field Correction */}
      {showCorrectionModal && editingField && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-slate-700 rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h2 className="text-sm font-bold text-white mb-1">Human-in-the-Loop Field Correction</h2>
            <p className="text-[11px] text-slate-400 mb-3 font-mono">Field: {editingField.field_name}</p>

            <form onSubmit={handleSaveCorrection} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Extracted Value</label>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-400">
                  {editingField.extracted_value}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Verified Correct Value</label>
                <input
                  type="text"
                  value={correctedValue}
                  onChange={(e) => setCorrectedValue(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white font-semibold px-3 py-1.5 rounded-lg"
                >
                  Save Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
