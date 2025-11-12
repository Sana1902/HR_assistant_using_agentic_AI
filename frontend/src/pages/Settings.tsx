import { Card, CardContent } from '@/components/ui/card';

export const Settings = () => {
  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-8 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-fuchsia-500/5 rounded-full blur-3xl animate-pulse delay-150"></div>
      </div>

      <div className="relative z-10 space-y-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-slate-400 mt-1">
            Configure preferences to tailor the HR assistant to your workflows.
          </p>
        </div>

        <Card className="border border-slate-700 bg-slate-800/50 backdrop-blur-xl">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">General Preferences</h2>
              <p className="text-sm text-slate-400">
                Coming soon — personalize notifications, themes, and collaboration options.
              </p>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Integrations</h2>
              <p className="text-sm text-slate-400">
                Connect payroll, ATS, and analytics systems to unlock automation features.
              </p>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Security</h2>
              <p className="text-sm text-slate-400">
                Manage access controls and monitor activity logs to keep your organization secure.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


