import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Loader2, CheckCircle2, AlertCircle, Upload, FileText, X } from 'lucide-react';

const ISSUE_TYPES = {
  'Login Issue': [
    'Reset password not working',
    'Unable to login to PMV app',
    'Unable to login to Indian bank App',
    'Login credentials not received'
  ],
  'Before Redemption': [
    'Article number missing',
    'Barcode Scanning/matching issue',
    'Artesian not available for delivery',
    'Artesian OTP authentication error',
    'Quality seal question not appearing',
    'Artesian denied for wrongly selected'
  ],
  'Redemption': [
    'Redemption Button not working',
    'Merchant ID not created error',
    'MPIN error',
    'E Voucher not Available',
    'E Voucher not able to scan',
    'E voucher successful redemption message not coming',
    'After successful redemption user not redirecting back to PMV'
  ],
  'After Redemption': [
    'Video button not working /clickable',
    'Video not uploading',
    'Acknowledgement capture not working',
    'Acknowledgement not uploading',
    'Video not uploading from pending bin',
    'Acknowledgement not uploading from pending bin'
  ]
};

const ticketSchema = z.object({
  email: z.string().email('Invalid email address'),
  circleUserId: z.string().min(1, 'Circle User ID is required'),
  divisionUserId: z.string().min(1, 'Division User ID is required'),
  deliveryStaffUserId: z.string().min(1, 'Delivery Staff User ID is required'),
  issueType: z.enum(['Login Issue', 'Before Redemption', 'Redemption', 'After Redemption']),
  subType: z.string().min(1, 'Sub Type is required'),
  articleNumber: z.string().min(1, 'Article Number/Booking ID is required'),
  mobileNumber: z.string().min(10, 'Valid mobile number is required'),
  eVoucherCode: z.string().optional(),
  applicationNumber: z.string().min(1, 'PMV Application Number is required'),
  artisanMobileNumber: z.string().min(10, 'Valid artisan mobile number is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export const StaffPage: React.FC = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      email: user?.email || '',
      issueType: 'Login Issue',
      circleUserId: 'CircleUser_IP_16',
      divisionUserId: 'DivisionUser_IP_49',
    }
  });

  const selectedIssueType = watch('issueType');
  const selectedSubType = watch('subType');

  // Reset subType when issueType changes
  useEffect(() => {
    setValue('subType', '');
  }, [selectedIssueType, setValue]);

  const isEVoucherRequired = 
    selectedIssueType === 'Redemption' && 
    ['E Voucher not Available', 'E Voucher not able to scan', 'E voucher successful redemption message not coming', 'After successful redemption user not redirecting back to PMV'].includes(selectedSubType);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const onSubmit = async (data: TicketFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare file data if exists
      let fileData = null;
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          throw new Error("File size exceeds 2MB limit.");
        }
        const base64 = await fileToBase64(file);
        fileData = {
          base64,
          name: file.name,
          type: file.type
        };
      }

      const docRef = await addDoc(collection(db, 'tickets'), {
        ...data,
        uid: user.uid,
        createdAt: serverTimestamp(),
        status: 'Open',
        hasAttachment: !!file
      });

      // Optional: Sync to Google Sheets via Webhook
      const webhookUrl = import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK_URL;
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors', // Apps Script requires no-cors for simple triggers
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...data,
              id: docRef.id,
              status: 'Open',
              timestamp: new Date().toISOString(),
              file: fileData
            })
          });
        } catch (webhookErr) {
          console.error("Webhook sync failed:", webhookErr);
        }
      }

      setSubmitSuccess(true);
      setFile(null);
    } catch (err: any) {
      console.error("Error submitting ticket:", err);
      setError(err.message || "Failed to submit ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="w-full mt-10 p-8 bg-white rounded-2xl shadow-xl text-center border-t-8 border-indiapost-red">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket Submitted Successfully!</h2>
        <p className="text-gray-600 mb-6">Our support team will look into your issue shortly.</p>
        <button
          onClick={() => setSubmitSuccess(false)}
          className="px-6 py-2 bg-indiapost-red text-white rounded-lg hover:bg-red-700 transition-colors font-bold"
        >
          Raise Another Ticket
        </button>
      </div>
    );
  }

  return (
    <div className="w-full py-6 sm:py-10 px-2 sm:px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl overflow-hidden border-t-8 border-indiapost-red w-full"
      >
        <div className="bg-indiapost-red p-6 text-white">
          <h1 className="text-2xl font-bold">Raise PM Vishwakarma Ticket</h1>
          <p className="opacity-90">Please fill in the details below to report an issue.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Email ID Confirmation</label>
              <input
                {...register('email')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indiapost-red outline-none transition-all"
                placeholder="email@example.com"
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Circle User ID</label>
              <input
                {...register('circleUserId')}
                readOnly
                className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Division User ID</label>
              <input
                {...register('divisionUserId')}
                readOnly
                className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Delivery Staff User ID</label>
              <input
                {...register('deliveryStaffUserId')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indiapost-red outline-none transition-all"
              />
              {errors.deliveryStaffUserId && <p className="text-xs text-red-500">{errors.deliveryStaffUserId.message}</p>}
            </div>

            {/* Issue Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Issue Type</label>
              <select
                {...register('issueType')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indiapost-red outline-none transition-all"
              >
                {Object.keys(ISSUE_TYPES).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Sub Type</label>
              <select
                {...register('subType')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indiapost-red outline-none transition-all"
              >
                <option value="">Select Sub Type</option>
                {ISSUE_TYPES[selectedIssueType].map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
              {errors.subType && <p className="text-xs text-red-500">{errors.subType.message}</p>}
            </div>

            {/* Additional Details */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Article Number/Booking ID</label>
              <input
                {...register('articleNumber')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indiapost-red outline-none transition-all"
              />
              {errors.articleNumber && <p className="text-xs text-red-500">{errors.articleNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Staff Mobile Number</label>
              <input
                {...register('mobileNumber')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indiapost-red outline-none transition-all"
              />
              {errors.mobileNumber && <p className="text-xs text-red-500">{errors.mobileNumber.message}</p>}
            </div>

            {isEVoucherRequired && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">E Voucher Code</label>
                <input
                  {...register('eVoucherCode')}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indiapost-red outline-none transition-all"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">PMV Application Number</label>
              <input
                {...register('applicationNumber')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indiapost-red outline-none transition-all"
              />
              {errors.applicationNumber && <p className="text-xs text-red-500">{errors.applicationNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Artisan Mobile Number</label>
              <input
                {...register('artisanMobileNumber')}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indiapost-red outline-none transition-all"
              />
              {errors.artisanMobileNumber && <p className="text-xs text-red-500">{errors.artisanMobileNumber.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Description</label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indiapost-red outline-none transition-all resize-none"
              placeholder="Provide more details about the issue..."
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Upload File (Max 2MB)</label>
            {!file ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indiapost-red transition-colors cursor-pointer bg-gray-50"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 mt-1">Images or PDF (Max 2MB)</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) setFile(selectedFile);
                  }}
                  className="hidden" 
                  accept="image/*,.pdf" 
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <FileText className="w-6 h-6 text-indiapost-red" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-red-500 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-indiapost-red text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-100"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Raise Ticket'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
