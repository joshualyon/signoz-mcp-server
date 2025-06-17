import { describe, it, expect } from 'vitest';
import { ResponseFormatter } from '../src/signoz/formatters.js';

describe('Debug Attribute Filtering', () => {
  const mockLogEntry = {
    timestamp: '2024-01-15T10:30:00Z',
    data: {
      body: 'Test log message',
      attributes_string: {
        level: 'info',
        severityText: 'info',
        'http.request.id': 'abc-123',
        'labels.module': 'rule',
        'log.file.path': '/var/log/test.log',
        'log.iostream': 'stdout',
        'logtag': 'F'
      },
      resources_string: {
        'service.name': 'test-service',
        'k8s.deployment.name': 'stio-api',
        'k8s.namespace.name': 'default',
        'k8s.node.uid': 'node-123',
        'k8s.pod.uid': 'pod-456',
        'signoz.component': 'otel-agent',
        'host.name': 'worker-node'
      }
    }
  };

  it('should exclude default noisy attributes in compact mode', () => {
    const result = ResponseFormatter.formatLogEntries([mockLogEntry], { verbose: false });
    
    console.log('=== COMPACT MODE OUTPUT ===');
    console.log(result);
    console.log('=== END OUTPUT ===');
    
    // Should include basic info
    expect(result).toContain('[2024-01-15T10:30:00Z] [info] [test-service]');
    expect(result).toContain('Test log message');
    
    // Should include useful attributes
    expect(result).toContain('http.request.id=abc-123');
    expect(result).toContain('labels.module=rule');
    expect(result).toContain('k8s.namespace.name=default');
    
    // Should exclude noisy attributes
    expect(result).not.toContain('log.file.path');
    expect(result).not.toContain('log.iostream');
    expect(result).not.toContain('k8s.node.uid');
    expect(result).not.toContain('k8s.pod.uid');
    expect(result).not.toContain('signoz.component');
    expect(result).not.toContain('host.name');
  });

  it('should include all attributes in verbose mode', () => {
    const result = ResponseFormatter.formatLogEntries([mockLogEntry], { verbose: true });
    
    console.log('=== VERBOSE MODE OUTPUT ===');
    console.log(result);
    console.log('=== END OUTPUT ===');
    
    // Should include ALL attributes in verbose mode
    expect(result).toContain('log.file.path=/var/log/test.log');
    expect(result).toContain('k8s.node.uid=node-123');
    expect(result).toContain('signoz.component=otel-agent');
  });

  it('should work with undefined options (default behavior)', () => {
    // This tests what happens when no options are passed
    const result = ResponseFormatter.formatLogEntries([mockLogEntry]);
    
    console.log('=== UNDEFINED OPTIONS OUTPUT ===');
    console.log(result);
    console.log('=== END OUTPUT ===');
    
    // Should behave like compact mode
    expect(result).toContain('[2024-01-15T10:30:00Z] [info] [test-service]');
    expect(result).not.toContain('log.file.path');
    expect(result).not.toContain('signoz.component');
  });

  it('should work with empty options object', () => {
    const result = ResponseFormatter.formatLogEntries([mockLogEntry], {});
    
    console.log('=== EMPTY OPTIONS OUTPUT ===');
    console.log(result);
    console.log('=== END OUTPUT ===');
    
    // Should behave like compact mode
    expect(result).toContain('[2024-01-15T10:30:00Z] [info] [test-service]');
    expect(result).not.toContain('log.file.path');
    expect(result).not.toContain('signoz.component');
  });
});