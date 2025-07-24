'use client';
import { useState, useMemo } from 'react';
import {
  Search,
  Settings,
  Phone,
  BarChart3,
  CreditCard,
  Cog,
  HelpCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import HelpfulFeedback from './HelpfulFeedback';

interface FaqQuestion {
  id: string;
  question: string;
  answer: string;
  popular?: boolean;
}

interface SerializableFaqCategory {
  id: string;
  name: string;
  iconName: string;
  questions: FaqQuestion[];
}

interface ExtendedQuestion extends FaqQuestion {
  categoryId: string;
  categoryName: string;
}

interface FAQSearchProps {
  categories: SerializableFaqCategory[];
  allQuestions: ExtendedQuestion[];
  popularQuestions: ExtendedQuestion[];
}

// Icon mapping for serializable icon names
const iconMap = {
  Settings,
  Phone,
  BarChart3,
  CreditCard,
  Cog,
  HelpCircle,
};

export default function FAQSearch({
  categories,
  allQuestions,
  popularQuestions,
}: FAQSearchProps) {
  const [search, setSearch] = useState('');

  // Enhanced search that includes both question and answer content
  const filteredCategories = useMemo(() => {
    if (!search) return categories;
    const term = search.toLowerCase();
    return categories
      .map(cat => ({
        ...cat,
        questions: cat.questions.filter(
          q =>
            q.question.toLowerCase().includes(term) ||
            q.answer.toLowerCase().includes(term)
        ),
      }))
      .filter(cat => cat.questions.length > 0);
  }, [search, categories]);

  const filteredPopularQuestions = useMemo(() => {
    if (!search) {
      return popularQuestions;
    }
    const term = search.toLowerCase();
    return popularQuestions.filter(
      q =>
        q.question.toLowerCase().includes(term) ||
        q.answer.toLowerCase().includes(term)
    );
  }, [search, popularQuestions]);

  return (
    <>
      <div className="mx-auto mb-10 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search questions and answers"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search questions and answers"
          />
        </div>
      </div>

      {filteredPopularQuestions.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-center text-2xl font-bold text-foreground">
            {search
              ? 'Popular Questions Matching Your Search'
              : 'Most Popular Questions'}
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {filteredPopularQuestions.map((q, idx) => (
              <AccordionItem key={q.id} value={`popular-${q.id}`}>
                <AccordionTrigger className="text-left">
                  {q.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p>{q.answer}</p>
                  <HelpfulFeedback questionId={q.id} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {filteredCategories.map(category => {
        const IconComponent =
          iconMap[category.iconName as keyof typeof iconMap] || HelpCircle;

        return (
          <section key={category.id} className="mb-10">
            <h2 className="mb-4 flex items-center text-2xl font-bold">
              <IconComponent className="mr-2 h-5 w-5" />
              {category.name}
            </h2>
            <Accordion type="single" collapsible className="space-y-2">
              {category.questions.map(q => (
                <AccordionItem key={q.id} value={`${category.id}-${q.id}`}>
                  <AccordionTrigger className="text-left">
                    {q.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p>{q.answer}</p>
                    <HelpfulFeedback questionId={q.id} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        );
      })}

      {search &&
        filteredCategories.length === 0 &&
        filteredPopularQuestions.length === 0 && (
          <div className="py-12 text-center">
            <p className="mb-4 text-lg text-muted-foreground">
              No questions found matching "{search}"
            </p>
            <p className="text-sm text-muted-foreground">
              Try searching with different keywords or browse all questions
              below.
            </p>
          </div>
        )}
    </>
  );
}
