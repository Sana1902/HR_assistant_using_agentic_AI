import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck, FileText, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const DOCUMENT_TYPES = [
  {
    id: 'offer_letter',
    name: 'Offer Letter',
    description: 'Generate employment offer letters',
    api: 'POST /api/v1/agents/documents/generate-offer-letter',
  },
  {
    id: 'contract',
    name: 'Employment Contract',
    description: 'Generate employment contracts',
    api: 'POST /api/v1/agents/documents/generate-contract',
  },
  {
    id: 'experience_certificate',
    name: 'Experience Certificate',
    description: 'Generate experience certificates',
    api: 'POST /api/v1/agents/documents/generate-experience-certificate',
  },
  {
    id: 'salary_certificate',
    name: 'Salary Certificate',
    description: 'Generate salary certificates',
    api: 'POST /api/v1/agents/documents/generate-salary-certificate',
  },
];

export const DocumentGenerationAgentInterface = () => {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-3 rounded-lg">
            <FileCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Document Generation Agent
            </h2>
            <p className="text-slate-600 mt-1">Auto-generates offer letters, contracts, certificates</p>
          </div>
        </div>
      </motion.div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Document Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DOCUMENT_TYPES.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{doc.name}</h4>
                    <p className="text-sm text-slate-600 mb-2">{doc.description}</p>
                    <div className="bg-slate-100 rounded px-2 py-1 text-xs font-mono text-slate-700">
                      {doc.api}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-500" />
            Email Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <p className="text-sm text-slate-700 mb-2">
              All generated documents can be automatically sent via email using the email service integration.
            </p>
            <div className="bg-white rounded px-3 py-2 text-xs font-mono text-slate-700">
              send_document_email(document, recipient_email)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

