import { Brain, DollarSign, Star, Target } from 'lucide-react';

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 0,
  }).format(value);

export const getPrefilledMessage = (lead: any) => {
  return `Hello ${lead.name},\n\nI am your student enrollment advisor from Dr Moono Business Development Consultancy.\n\nYour next steps:\n1. Fill Form\n2. Upload Documents\n3. Pay Deposit\n\nLet me know if you need any assistance.\n\nBest regards,\nEnrollment Team`;
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 border border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    default:
      return 'bg-green-100 text-green-700 border border-green-200';
  }
};

export const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    new: 'bg-gray-100 text-gray-700 border border-gray-200',
    contacted: 'bg-blue-100 text-blue-700 border border-blue-200',
    qualified: 'bg-purple-100 text-purple-700 border border-purple-200',
    converted: 'bg-green-100 text-green-700 border border-green-200',
    lost: 'bg-red-100 text-red-700 border border-red-200',
  };
  return styles[status] || styles.new;
};

export const getIntentIcon = (intent: string) => {
  switch (intent) {
    case 'ready_to_apply':
      return <Star className="w-4 h-4 text-green-600" />;
    case 'price_sensitive':
      return <DollarSign className="w-4 h-4 text-yellow-600" />;
    case 'seeking_info':
      return <Brain className="w-4 h-4 text-blue-600" />;
    default:
      return <Target className="w-4 h-4 text-gray-400" />;
  }
};
