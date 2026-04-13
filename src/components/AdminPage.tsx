import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Search, Filter, Trash2, ExternalLink, Clock, CheckCircle, AlertCircle, Download, Save, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface Ticket {
  id: string;
  email: string;
  circleUserId: string;
  divisionUserId: string;
  deliveryStaffUserId: string;
  issueType: string;
  subType: string;
  articleNumber: string;
  mobileNumber: string;
  eVoucherCode?: string;
  applicationNumber: string;
  artisanMobileNumber: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  ticketNumber?: string;
  createdAt: any;
}

export const AdminPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketNumberInput, setTicketNumberInput] = useState('');
  const [isUpdatingTicketNum, setIsUpdatingTicketNum] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      setTickets(ticketData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tickets:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      setTicketNumberInput(selectedTicket.ticketNumber || '');
      setShowDeleteConfirm(false);
    }
  }, [selectedTicket]);

  const updateStatus = async (ticketId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const updateTicketNumber = async () => {
    if (!selectedTicket) return;
    setIsUpdatingTicketNum(true);
    try {
      await updateDoc(doc(db, 'tickets', selectedTicket.id), { ticketNumber: ticketNumberInput });
      setSelectedTicket({ ...selectedTicket, ticketNumber: ticketNumberInput });
    } catch (error) {
      console.error("Error updating ticket number:", error);
    } finally {
      setIsUpdatingTicketNum(false);
    }
  };

  const deleteTicket = async (ticketId: string) => {
    try {
      await deleteDoc(doc(db, 'tickets', ticketId));
      if (selectedTicket?.id === ticketId) setSelectedTicket(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting ticket:", error);
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredTickets.map(t => ({
      'Ticket ID': t.id,
      'Official Ticket No': t.ticketNumber || 'N/A',
      'Status': t.status,
      'Date Raised': t.createdAt?.toDate() ? format(t.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
      'Email': t.email,
      'Circle User ID': t.circleUserId,
      'Division User ID': t.divisionUserId,
      'Staff User ID': t.deliveryStaffUserId,
      'Staff Mobile': t.mobileNumber,
      'Issue Type': t.issueType,
      'Sub Type': t.subType,
      'Article No': t.articleNumber,
      'App No': t.applicationNumber,
      'Artisan Mobile': t.artisanMobileNumber,
      'E-Voucher Code': t.eVoucherCode || 'N/A',
      'Description': t.description
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets");
    XLSX.writeFile(workbook, `PMV_Tickets_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.deliveryStaffUserId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.ticketNumber && ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-red-100 text-indiapost-red';
      case 'In Progress': return 'bg-yellow-100 text-yellow-700';
      case 'Resolved': return 'bg-green-100 text-green-700';
      case 'Closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-indiapost-red" />
      </div>
    );
  }

  return (
    <div className="w-full py-6 sm:py-8 px-2 sm:px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">{filteredTickets.length} tickets found</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={exportToExcel}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indiapost-red outline-none w-full sm:w-64"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indiapost-red outline-none appearance-none bg-white min-w-[140px]"
            >
              <option value="All">All Status</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ticket List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredTickets.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-dashed border-gray-300">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No tickets found matching your criteria.</p>
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <motion.div
                key={ticket.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-5 rounded-xl border cursor-pointer transition-all ${
                  selectedTicket?.id === ticket.id 
                    ? 'border-indiapost-red bg-red-50 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-red-300 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{ticket.issueType}</h3>
                      {ticket.ticketNumber && (
                        <span className="text-[10px] font-bold bg-indiapost-red text-white px-2 py-0.5 rounded uppercase">
                          {ticket.ticketNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{ticket.subType}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-gray-600">
                  <div>
                    <p className="font-semibold text-gray-400 uppercase tracking-wider mb-1">Staff ID</p>
                    <p>{ticket.deliveryStaffUserId}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-400 uppercase tracking-wider mb-1">App No</p>
                    <p>{ticket.applicationNumber}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-400 uppercase tracking-wider mb-1">Date</p>
                    <p>{ticket.createdAt?.toDate() ? format(ticket.createdAt.toDate(), 'MMM dd, HH:mm') : 'Pending'}</p>
                  </div>
                  <div className="flex justify-end items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Ticket Detail Sidebar */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedTicket ? (
              <motion.div
                key={selectedTicket.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden sticky top-8"
              >
                <div className="bg-indiapost-red p-6 text-white">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-bold">Ticket Details</h2>
                    <button onClick={() => setSelectedTicket(null)} className="text-white/70 hover:text-white">×</button>
                  </div>
                  <p className="text-sm opacity-70">ID: {selectedTicket.id}</p>
                </div>

                <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {/* Ticket Number Update */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Assign Ticket Number</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ticketNumberInput}
                        onChange={(e) => setTicketNumberInput(e.target.value)}
                        placeholder="e.g. TKT-12345"
                        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indiapost-red outline-none"
                      />
                      <button
                        onClick={updateTicketNumber}
                        disabled={isUpdatingTicketNum}
                        className="p-2 bg-indiapost-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {isUpdatingTicketNum ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Update Status</label>
                    <div className="flex flex-wrap gap-2">
                      {['Open', 'In Progress', 'Resolved', 'Closed'].map(status => (
                        <button
                          key={status}
                          onClick={() => updateStatus(selectedTicket.id, status)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            selectedTicket.status === status 
                              ? getStatusColor(status) + ' ring-2 ring-offset-1 ring-current'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ticket Information</label>
                    <button
                      onClick={() => {
                        const allData = [
                          `Issue Type: ${selectedTicket.issueType}`,
                          `Sub Type: ${selectedTicket.subType}`,
                          `Email: ${selectedTicket.email}`,
                          `Circle ID: ${selectedTicket.circleUserId}`,
                          `Division ID: ${selectedTicket.divisionUserId}`,
                          `Staff ID: ${selectedTicket.deliveryStaffUserId}`,
                          `Article No: ${selectedTicket.articleNumber}`,
                          `Staff Mobile: ${selectedTicket.mobileNumber}`,
                          `App No: ${selectedTicket.applicationNumber}`,
                          `Artisan Mobile: ${selectedTicket.artisanMobileNumber}`,
                          `E-Voucher: ${selectedTicket.eVoucherCode || 'N/A'}`,
                          `Description: ${selectedTicket.description}`
                        ].join('\n');
                        navigator.clipboard.writeText(allData);
                      }}
                      className="text-xs flex items-center gap-1 text-indiapost-red hover:underline font-bold"
                    >
                      <Copy className="w-3 h-3" />
                      Copy All Data
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <DetailItem label="Issue Type" value={selectedTicket.issueType} />
                    <DetailItem label="Sub Type" value={selectedTicket.subType} />
                    <DetailItem label="Email" value={selectedTicket.email} />
                    <DetailItem label="Circle User ID" value={selectedTicket.circleUserId} />
                    <DetailItem label="Division User ID" value={selectedTicket.divisionUserId} />
                    <DetailItem label="Staff User ID" value={selectedTicket.deliveryStaffUserId} />
                    <DetailItem label="Article Number" value={selectedTicket.articleNumber} />
                    <DetailItem label="Staff Mobile" value={selectedTicket.mobileNumber} />
                    {selectedTicket.eVoucherCode && <DetailItem label="E-Voucher Code" value={selectedTicket.eVoucherCode} />}
                    <DetailItem label="PMV App No" value={selectedTicket.applicationNumber} />
                    <DetailItem label="Artisan Mobile" value={selectedTicket.artisanMobileNumber} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Description</label>
                      <button 
                        onClick={() => navigator.clipboard.writeText(selectedTicket.description)}
                        className="text-gray-400 hover:text-indiapost-red transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-700 leading-relaxed break-words">
                      {selectedTicket.description}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100">
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full py-3 px-4 bg-white border-2 border-red-100 text-red-600 rounded-xl font-bold hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Ticket
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-red-600 text-center">Are you absolutely sure?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => deleteTicket(selectedTicket.id)}
                            className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all text-sm"
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition-all text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 text-center mt-2">
                      This will permanently remove the ticket from all views.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400 sticky top-8">
                <ExternalLink className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Select a ticket to view full details and manage status.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }: { label: string, value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative flex justify-between items-start p-2 hover:bg-gray-50 rounded-lg transition-colors">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-gray-900 font-medium break-all">{value}</p>
      </div>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-indiapost-red transition-all"
        title="Copy to clipboard"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
};

