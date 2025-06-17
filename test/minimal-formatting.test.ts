import { describe, it, expect } from 'vitest';
import { ResponseFormatter } from '../src/signoz/formatters.js';

describe('Minimal Formatting (New Approach)', () => {
  const mockServiceLogEntry = {
    timestamp: '2024-01-15T10:30:00Z',
    data: {
      body: 'Service log message',
      attributes_string: {
        level: 'info',
        'http.request.id': 'abc-123',
        'labels.module': 'rule'
      },
      resources_string: {
        'service.name': 'my-service',
        'k8s.deployment.name': 'backup-deployment',
        'k8s.namespace.name': 'production'
      }
    }
  };

  const mockK8sLogEntry = {
    timestamp: '2024-01-15T10:30:00Z',
    data: {
      body: 'K8s service log message',
      attributes_string: {
        level: 'error',
        'http.request.id': 'xyz-456'
      },
      resources_string: {
        'k8s.deployment.name': 'my-api',
        'k8s.namespace.name': 'production',
        'k8s.pod.name': 'my-api-12345',
        'k8s.container.name': 'app'
      }
    }
  };

  describe('Compact Mode (Default)', () => {
    it('should show ONLY timestamp, level, service context, and message', () => {
      const result = ResponseFormatter.formatLogEntries([mockServiceLogEntry], { verbose: false });
      
      console.log('=== NEW COMPACT MODE OUTPUT ===');
      console.log(result);
      console.log('=== END OUTPUT ===');
      
      // Should include basic structure
      expect(result).toContain('[2024-01-15T10:30:00Z] [info] [my-service]');
      expect(result).toContain('Service log message');
      
      // Should NOT include ANY attributes by default
      expect(result).not.toContain('Attributes:');
      expect(result).not.toContain('http.request.id');
      expect(result).not.toContain('labels.module');
    });

    it('should show k8s context when no service.name available', () => {
      const result = ResponseFormatter.formatLogEntries([mockK8sLogEntry], { verbose: false });
      
      console.log('=== K8S CONTEXT OUTPUT ===');
      console.log(result);
      console.log('=== END OUTPUT ===');
      
      // Should show namespace/deployment format
      expect(result).toContain('[2024-01-15T10:30:00Z] [error] [production/my-api]');
      expect(result).toContain('K8s service log message');
      
      // Should NOT include ANY attributes by default
      expect(result).not.toContain('Attributes:');
    });

    it('should show attributes only when explicitly included', () => {
      const result = ResponseFormatter.formatLogEntries([mockServiceLogEntry], {
        include_attributes: ['http.request.id', 'labels.module']
      });
      
      console.log('=== EXPLICIT INCLUDE OUTPUT ===');
      console.log(result);
      console.log('=== END OUTPUT ===');
      
      // Should include basic structure
      expect(result).toContain('[2024-01-15T10:30:00Z] [info] [my-service]');
      
      // Should include ONLY explicitly requested attributes
      expect(result).toContain('Attributes: http.request.id=abc-123 labels.module=rule');
    });
  });

  describe('Verbose Mode', () => {
    it('should include all attributes', () => {
      const result = ResponseFormatter.formatLogEntries([mockServiceLogEntry], { verbose: true });
      
      console.log('=== NEW VERBOSE MODE OUTPUT ===');
      console.log(result);
      console.log('=== END OUTPUT ===');
      
      // Should include service name (not k8s context since service.name exists)
      expect(result).toContain('[2024-01-15T10:30:00Z] [info] [my-service]');
      
      // Should include all non-basic attributes
      expect(result).toContain('Attributes:');
      expect(result).toContain('http.request.id=abc-123');
      expect(result).toContain('labels.module=rule');
      
      // Should exclude fields already shown in the header
      expect(result).not.toContain('service.name=my-service');
      expect(result).not.toContain('k8s.deployment.name=backup-deployment');
      expect(result).not.toContain('k8s.namespace.name=production');
    });
  });

  describe('Service Context Building', () => {
    it('should prefer service.name over k8s context', () => {
      const result = ResponseFormatter.formatLogEntries([mockServiceLogEntry]);
      expect(result).toContain('[my-service]');
    });

    it('should use namespace/deployment when no service.name', () => {
      const result = ResponseFormatter.formatLogEntries([mockK8sLogEntry]);
      expect(result).toContain('[production/my-api]');
    });

    it('should fallback gracefully with missing context', () => {
      const minimalEntry = {
        timestamp: '2024-01-15T10:30:00Z',
        data: {
          body: 'Minimal log',
          attributes_string: { level: 'warn' },
          resources_string: {}
        }
      };
      
      const result = ResponseFormatter.formatLogEntries([minimalEntry]);
      expect(result).toContain('[2024-01-15T10:30:00Z] [warn] [unknown]');
      expect(result).toContain('Minimal log');
    });
  });
});