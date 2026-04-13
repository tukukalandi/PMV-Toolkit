import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Loader2, Search, Clock, CheckCircle, AlertCircle, Ticket as TicketIcon } from 'lucide-react';
import { format } from 'date-fns';

interface Ticket {
  id: string;
  issueType: string;
  subType: string;
  status: string;
  ticketNumber?: string;
  createdAt: any;
  applicationNumber: string;
  deliveryStaffUserId: string;
  articleNumber: string;
}

export const TicketStatusPage: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'tickets'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      setTickets(ticketData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching user tickets:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredTickets = tickets.filter(ticket => 
    ticket.issueType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ticket.ticketNumber && ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
    <div className="w-full py-6 sm:py-10 px-2 sm:px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
          <p className="text-gray-500">Track the status of your raised issues.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by App No or Ticket No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indiapost-red outline-none w-full sm:w-64"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
            <TicketIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No tickets found.</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-gray-900">{ticket.issueType}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{ticket.subType}</p>
                </div>

                <div className="flex flex-col sm:items-end gap-1">
                  {ticket.ticketNumber ? (
                    <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                      <span className="text-[10px] font-bold text-indiapost-red uppercase">Ticket No:</span>
                      <span className="text-sm font-bold text-indiapost-red">{ticket.ticketNumber}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Ticket number pending...</span>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {ticket.createdAt?.toDate() ? format(ticket.createdAt.toDate(), 'MMM dd, yyyy HH:mm') : 'Just now'}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
                <div>
                  <span className="font-semibold text-gray-400 uppercase mr-1">Staff ID:</span>
                  {ticket.deliveryStaffUserId}
                </div>
                <div>
                  <span className="font-semibold text-gray-400 uppercase mr-1">Article No:</span>
                  {ticket.articleNumber}
                </div>
                <div>
                  <span className="font-semibold text-gray-400 uppercase mr-1">App No:</span>
                  {ticket.applicationNumber}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
