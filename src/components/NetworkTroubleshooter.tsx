import React, { useState, useEffect } from 'react';

interface NetworkTroubleshooterProps {
  isVisible: boolean;
  onClose: () => void;
}

const NetworkTroubleshooter: React.FC<NetworkTroubleshooterProps> = ({ isVisible, onClose }) => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline' | 'limited'>('checking');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    // Check connection status
    const checkConnection = async () => {
      try {
        // Try to fetch a small resource to test connectivity
        const response = await fetch('/favicon.ico', { 
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          setConnectionStatus('online');
        } else {
          setConnectionStatus('limited');
        }
      } catch (error) {
        setConnectionStatus('offline');
      }
    };

    checkConnection();
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Connection Issue Detected</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2 p-3 bg-gray-700 rounded">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'online' ? 'bg-green-500' : 
              connectionStatus === 'limited' ? 'bg-yellow-500' : 
              connectionStatus === 'offline' ? 'bg-red-500' : 'bg-gray-500'
            }`}></div>
            <span className="text-white">
              {connectionStatus === 'checking' && 'Checking connection...'}
              {connectionStatus === 'online' && 'Connection OK'}
              {connectionStatus === 'limited' && 'Limited connectivity'}
              {connectionStatus === 'offline' && 'Connection blocked'}
            </span>
          </div>

          {/* DNS Error Explanation */}
          <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded p-3">
            <h3 className="font-bold text-red-400 mb-2">DNS/Network Blocking Detected</h3>
            <p className="text-red-300 text-sm">
              Your network or ISP may be blocking access to this game. This is common on:
            </p>
            <ul className="text-red-300 text-sm mt-2 list-disc list-inside">
              <li>Work or school networks</li>
              <li>Public WiFi with restrictions</li>
              <li>ISPs with content filtering</li>
              <li>Routers with strict security settings</li>
            </ul>
          </div>

          {/* Quick Solutions */}
          <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded p-3">
            <h3 className="font-bold text-blue-400 mb-2">Quick Solutions</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">1.</span>
                <span className="text-blue-300">Try a different network (mobile hotspot, different WiFi)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">2.</span>
                <span className="text-blue-300">Use a VPN service to bypass restrictions</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">3.</span>
                <span className="text-blue-300">Contact your network administrator</span>
              </div>
            </div>
          </div>

          {/* Advanced Solutions Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Solutions
          </button>

          {showAdvanced && (
            <div className="bg-gray-700 rounded p-3 space-y-3">
              <h3 className="font-bold text-white mb-2">Advanced DNS Solutions</h3>
              
              <div className="text-sm space-y-2">
                <div>
                  <h4 className="font-semibold text-yellow-400">Change DNS Servers:</h4>
                  <p className="text-gray-300">In your network settings, try these DNS servers:</p>
                  <div className="bg-gray-800 p-2 rounded mt-1 font-mono text-xs">
                    <div>Google DNS: 8.8.8.8, 8.8.4.4</div>
                    <div>Cloudflare: 1.1.1.1, 1.0.0.1</div>
                    <div>OpenDNS: 208.67.222.222, 208.67.220.220</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-yellow-400">Router Settings:</h4>
                  <p className="text-gray-300">
                    Access your router admin panel (usually 192.168.1.1) and:
                  </p>
                  <ul className="text-gray-300 list-disc list-inside text-xs mt-1">
                    <li>Disable content filtering</li>
                    <li>Change DNS settings</li>
                    <li>Add this domain to allowlist</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-yellow-400">Browser Solutions:</h4>
                  <ul className="text-gray-300 list-disc list-inside text-xs">
                    <li>Clear browser cache and cookies</li>
                    <li>Disable browser extensions</li>
                    <li>Try incognito/private mode</li>
                    <li>Try a different browser</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="bg-green-900 bg-opacity-30 border border-green-500 rounded p-3">
            <h3 className="font-bold text-green-400 mb-2">Still Having Issues?</h3>
            <p className="text-green-300 text-sm">
              If none of these solutions work, the issue is likely with your network provider's 
              DNS filtering or firewall settings. Contact your IT department or ISP for assistance.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white p-2 rounded transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkTroubleshooter; 