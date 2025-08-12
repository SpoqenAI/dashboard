import {
  TERMINATION_POLICY_SENTINEL,
  TERMINATION_POLICY_TEXT,
  renderTerminationPolicy,
  ensureTerminationPolicyAppended,
  stripTerminationPolicy,
} from './termination-policy';

describe('Termination Policy Module', () => {
  describe('renderTerminationPolicy', () => {
    it('should substitute displayName correctly', () => {
      const displayName = 'John Smith';
      const result = renderTerminationPolicy(displayName);

      expect(result).toContain("I can help when it's about John Smith's work");
      expect(result).toContain("I'll let John Smith know you reached out");
      expect(result).not.toContain('{displayName}');
    });

    it('should handle special characters in displayName', () => {
      const displayName = "O'Connor & Associates";
      const result = renderTerminationPolicy(displayName);

      expect(result).toContain(
        "I can help when it's about O'Connor & Associates's work"
      );
      expect(result).toContain(
        "I'll let O'Connor & Associates know you reached out"
      );
    });

    it('should handle empty displayName', () => {
      const displayName = '';
      const result = renderTerminationPolicy(displayName);

      expect(result).toContain("I can help when it's about 's work");
      expect(result).toContain("I'll let  know you reached out");
      expect(result).not.toContain('{displayName}');
    });

    it('should preserve the sentinel and policy structure', () => {
      const displayName = 'Test Agent';
      const result = renderTerminationPolicy(displayName);

      expect(result).toContain(TERMINATION_POLICY_SENTINEL);
      expect(result).toContain(
        'Termination policy (be extremely conservative)'
      );
      expect(result).toContain('Only end the call if absolutely necessary');
      expect(result).toContain('Persistent off-topic conversation');
      expect(result).toContain('Harassment, abusive language');
      expect(result).toContain('Repeated refusal to provide a purpose');
    });

    it('should replace all occurrences of placeholder', () => {
      const displayName = 'Agent Smith';
      const result = renderTerminationPolicy(displayName);

      // Count occurrences of the displayName in the result
      const occurrences = (result.match(/Agent Smith/g) || []).length;
      expect(occurrences).toBe(2); // Should appear twice in the template

      // Ensure no placeholders remain
      expect(result).not.toContain('{displayName}');
    });
  });

  describe('ensureTerminationPolicyAppended', () => {
    describe('Empty/undefined systemPrompt path', () => {
      it('should return filled policy when systemPrompt is empty string', () => {
        const result = ensureTerminationPolicyAppended('', 'Test Agent');

        expect(result).toContain(TERMINATION_POLICY_SENTINEL);
        expect(result).toContain('Test Agent');
        expect(result).not.toContain('{displayName}');
      });

      it('should return filled policy when systemPrompt is undefined', () => {
        const result = ensureTerminationPolicyAppended(
          undefined as any,
          'Test Agent'
        );

        expect(result).toContain(TERMINATION_POLICY_SENTINEL);
        expect(result).toContain('Test Agent');
        expect(result).not.toContain('{displayName}');
      });

      it('should return filled policy when systemPrompt is null', () => {
        const result = ensureTerminationPolicyAppended(
          null as any,
          'Test Agent'
        );

        expect(result).toContain(TERMINATION_POLICY_SENTINEL);
        expect(result).toContain('Test Agent');
        expect(result).not.toContain('{displayName}');
      });

      it('should use default displayName fallback when not provided', () => {
        const result = ensureTerminationPolicyAppended('');

        expect(result).toContain('the business owner');
        expect(result).toContain(TERMINATION_POLICY_SENTINEL);
      });
    });

    describe('Idempotence when sentinel present', () => {
      it('should return unchanged prompt when sentinel already present', () => {
        const existingPrompt = `You are a helpful assistant.

${TERMINATION_POLICY_SENTINEL}

Termination policy (be extremely conservative):
- Only end the call if absolutely necessary.
- This is already present.`;

        const result = ensureTerminationPolicyAppended(
          existingPrompt,
          'New Agent'
        );

        expect(result).toBe(existingPrompt);
        expect(result).not.toContain('New Agent'); // Should not modify existing content
      });

      it('should be idempotent - multiple calls should not change result', () => {
        const originalPrompt = 'You are a helpful assistant.';

        const firstCall = ensureTerminationPolicyAppended(
          originalPrompt,
          'Test Agent'
        );
        const secondCall = ensureTerminationPolicyAppended(
          firstCall,
          'Different Agent'
        );
        const thirdCall = ensureTerminationPolicyAppended(
          secondCall,
          'Another Agent'
        );

        expect(firstCall).toBe(secondCall);
        expect(secondCall).toBe(thirdCall);
        expect(firstCall).toContain('Test Agent'); // Should keep original substitution
        expect(firstCall).not.toContain('Different Agent');
        expect(firstCall).not.toContain('Another Agent');
      });

      it('should detect sentinel anywhere in the prompt', () => {
        const promptWithSentinelInMiddle = `You are a helpful assistant.
        
Some other instructions here.

${TERMINATION_POLICY_SENTINEL}

More content after sentinel.`;

        const result = ensureTerminationPolicyAppended(
          promptWithSentinelInMiddle,
          'Test Agent'
        );

        expect(result).toBe(promptWithSentinelInMiddle);
      });
    });

    describe('Correct substitution and appending', () => {
      it('should append policy to existing prompt with correct substitution', () => {
        const originalPrompt = 'You are a helpful real estate assistant.';
        const displayName = 'Sarah Johnson';

        const result = ensureTerminationPolicyAppended(
          originalPrompt,
          displayName
        );

        expect(result).toContain(originalPrompt);
        expect(result).toContain(TERMINATION_POLICY_SENTINEL);
        expect(result).toContain('Sarah Johnson');
        expect(result).not.toContain('{displayName}');

        // Should have proper spacing
        expect(result).toMatch(
          /You are a helpful real estate assistant\.\s+BEGIN_TERMINATION_POLICY/
        );
      });

      it('should handle prompts with trailing whitespace', () => {
        const originalPrompt = 'You are a helpful assistant.   \n\n  ';
        const displayName = 'Test Agent';

        const result = ensureTerminationPolicyAppended(
          originalPrompt,
          displayName
        );

        expect(result).toContain('You are a helpful assistant.');
        expect(result).toContain(TERMINATION_POLICY_SENTINEL);
        expect(result).not.toMatch(/You are a helpful assistant\.\s{3,}/); // Should trim excess whitespace
      });

      it('should handle prompts with no trailing newline', () => {
        const originalPrompt = 'You are a helpful assistant.';
        const displayName = 'Test Agent';

        const result = ensureTerminationPolicyAppended(
          originalPrompt,
          displayName
        );

        const lines = result.split('\n');
        expect(lines[0]).toBe('You are a helpful assistant.');
        expect(lines[1]).toBe('');
        expect(lines[2]).toContain(TERMINATION_POLICY_SENTINEL);
      });

      it('should preserve existing prompt structure', () => {
        const originalPrompt = `You are a helpful assistant.

Instructions:
1. Be polite
2. Be helpful
3. Be concise

Additional context:
- Work in real estate
- Handle customer inquiries`;

        const displayName = 'Mike Wilson';
        const result = ensureTerminationPolicyAppended(
          originalPrompt,
          displayName
        );

        expect(result).toContain(originalPrompt);
        expect(result).toContain('Mike Wilson');
        expect(result).toContain(TERMINATION_POLICY_SENTINEL);

        // Should append after the original content
        const originalIndex = result.indexOf(originalPrompt);
        const sentinelIndex = result.indexOf(TERMINATION_POLICY_SENTINEL);
        expect(sentinelIndex).toBeGreaterThan(
          originalIndex + originalPrompt.length
        );
      });
    });

    describe('Edge cases and error handling', () => {
      it('should handle non-string systemPrompt gracefully', () => {
        const result1 = ensureTerminationPolicyAppended(
          123 as any,
          'Test Agent'
        );
        const result2 = ensureTerminationPolicyAppended(
          {} as any,
          'Test Agent'
        );
        const result3 = ensureTerminationPolicyAppended(
          [] as any,
          'Test Agent'
        );

        [result1, result2, result3].forEach(result => {
          expect(result).toContain(TERMINATION_POLICY_SENTINEL);
          expect(result).toContain('Test Agent');
          expect(result).not.toContain('{displayName}');
        });
      });

      it('should handle special characters in displayName during append', () => {
        const originalPrompt = 'You are a helpful assistant.';
        const displayName = 'José María & Co.';

        const result = ensureTerminationPolicyAppended(
          originalPrompt,
          displayName
        );

        expect(result).toContain('José María & Co.');
        expect(result).toContain(originalPrompt);
        expect(result).toContain(TERMINATION_POLICY_SENTINEL);
      });

      it('should handle very long displayNames', () => {
        const originalPrompt = 'You are a helpful assistant.';
        const longDisplayName = 'A'.repeat(1000);

        const result = ensureTerminationPolicyAppended(
          originalPrompt,
          longDisplayName
        );

        expect(result).toContain(longDisplayName);
        expect(result).toContain(TERMINATION_POLICY_SENTINEL);
        expect(result.length).toBeGreaterThan(
          originalPrompt.length + TERMINATION_POLICY_TEXT.length
        );
      });
    });
  });

  describe('Module constants', () => {
    it('should export correct sentinel value', () => {
      expect(TERMINATION_POLICY_SENTINEL).toBe('BEGIN_TERMINATION_POLICY v1');
    });

    it('should have policy text with placeholders', () => {
      expect(TERMINATION_POLICY_TEXT).toContain('{displayName}');
      expect(TERMINATION_POLICY_TEXT).toContain(TERMINATION_POLICY_SENTINEL);
      expect(TERMINATION_POLICY_TEXT).toContain(
        'Termination policy (be extremely conservative)'
      );
    });

    it('should have exactly 2 placeholder occurrences in template', () => {
      const placeholderCount = (
        TERMINATION_POLICY_TEXT.match(/{displayName}/g) || []
      ).length;
      expect(placeholderCount).toBe(2);
    });
  });

  describe('stripTerminationPolicy', () => {
    it('removes sentinel and everything after it, trimming trailing whitespace before sentinel', () => {
      const content = `You are a helpful assistant.\n\nSome instructions here.   \n\n${TERMINATION_POLICY_SENTINEL}\n\nHidden developer policy...`;
      const result = stripTerminationPolicy(content);
      expect(result).toBe(
        'You are a helpful assistant.\n\nSome instructions here.'
      );
      expect(result).not.toContain(TERMINATION_POLICY_SENTINEL);
    });

    it('returns original content when sentinel is not present', () => {
      const content = 'No sentinel here.';
      const result = stripTerminationPolicy(content);
      expect(result).toBe(content);
    });

    it('handles null and undefined by returning empty string', () => {
      expect(stripTerminationPolicy(undefined as any)).toBe('');
      expect(stripTerminationPolicy(null as any)).toBe('');
    });

    it('does not include sentinel in saved/stripped content', () => {
      const content = `Hello world.\n\n${TERMINATION_POLICY_SENTINEL}\nPOLICY...`;
      const stripped = stripTerminationPolicy(content);
      expect(stripped.includes(TERMINATION_POLICY_SENTINEL)).toBe(false);
    });
  });
});
