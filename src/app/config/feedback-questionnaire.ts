import { AppShellFeedbackQuestion } from '@opendevstack/ngx-appshell';

export const MARKETPLACE_FEEDBACK_QUESTIONS: AppShellFeedbackQuestion[] = [
    {
        id: 'goal',
        type: 'multiple',
        label: 'What did you come here to do today?',
        options: [
            'Create a support ticket',
            'Find a data product',
            'Request access to data products',
            'Check status on test executions',
            'Discover learning activities',
            'Other'
        ],
        followUp: { option: 'Other', id: 'goalOther', label: 'What was it?', placeholder: 'Describe it briefly', maxLength: 500 }
    },
    {
        id: 'goalAchieved',
        type: 'choice',
        label: 'Were you able to achieve it?',
        options: ['Yes', 'Partially', 'No'],
        followUp: { option: 'No', id: 'goalBlocker', label: 'What prevented you from achieving it?', maxLength: 1000 }
    },
    {
        id: 'satisfaction',
        type: 'scale',
        label: 'How satisfied were you with {product}?',
        min: 1,
        max: 5,
        optionLabels: ['Very dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very satisfied']
    },
    {
        id: 'ratingReason',
        type: 'text',
        label: 'What is the main reason for your rating?',
        inputLabel: 'Type your answer',
        maxLength: 1000
    }
];

export const MARKETPLACE_FEEDBACK_PRODUCT_QUESTION: AppShellFeedbackQuestion = {
  id: 'suggestion',
  type: 'text',
  label: 'What would you like to see in {product}?',
  inputLabel: 'Type your answer',
  maxLength: 1000
};
