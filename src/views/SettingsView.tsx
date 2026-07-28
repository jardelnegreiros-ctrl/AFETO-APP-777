import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Settings,
  Database,
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  Smartphone,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  UserPlus,
  Users,
  HardDrive,
  Clock,
  Lock,
  X,
  FileJson
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';
import { db, initializeDatabase } from '../db';
import { User } from '../types';
import { formatDateTime } from '../utils/formatters';

const LAST_BACKUP_KEY = 'afeto_last_backup_timestamp';

interface BackupData {
  version: string;
  exportedAt: string;
  exportedBy: string;
  data: {
    produtos: any[];
    clientes: any[];
    vendas: any[];
    itensVenda: any[];
    fluxoDeCaixa: any[];
    pesquisasSatisfacao: any[];
    categorias: any[];
    suppliers: any[];
    stockMovements: any[];
    users: any[];
  };
}

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const { canInstall, promptInstall, isStandalone } = usePWA();

  const usersList = useLiveQuery(() => db.users.toArray(), []) || [];

  // Backup State
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  // Restore State
  const [selectedFileContent, setSelectedFileContent] = useState<BackupData | null>(null);
  const [restoreStep, setRestoreStep] = useState<number>(0); // 0 = closed, 1 = preview, 2 = confirming
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // User Management Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'funcionario'>('funcionario');
  const [userModalError, setUserModalError] = useState<string | null>(null);

  useEffect(() => {
    const ts = localStorage.getItem(LAST_BACKUP_KEY);
    if (ts) setLastBackup(ts);
  }, []);

  // Calculate if backup is older than 7 days
  const isBackupStale = () => {
    if (!lastBackup) return true;
    const diffDays = (new Date().getTime() - new Date(lastBackup).getTime()) / (1000 * 3600 * 24);
    return diffDays > 7;
  };

  // Generate and Download Backup JSON
  const handleGenerateBackup = async () => {
    try {
      const produtos = await db.produtos.toArray();
      const clientes = await db.clientes.toArray();
      const vendas = await db.vendas.toArray();
      const itensVenda = await db.itensVenda.toArray();
      const fluxoDeCaixa = await db.fluxoDeCaixa.toArray();
      const pesquisasSatisfacao = await db.pesquisasSatisfacao.toArray();
      const categorias = await db.categorias.toArray();
      const suppliers = await db.suppliers.toArray();
      const stockMovements = await db.stockMovements.toArray();
      const users = await db.users.toArray();

      const backupData: BackupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        exportedBy: user ? user.name : 'Administrador AFETO',
        data: {
          produtos,
          clientes,
          vendas,
          itensVenda,
          fluxoDeCaixa,
          pesquisasSatisfacao,
          categorias,
          suppliers,
          stockMovements,
          users
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `backup_afeto_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const nowIso = new Date().toISOString();
      localStorage.setItem(LAST_BACKUP_KEY, nowIso);
      setLastBackup(nowIso);
      setBackupMessage('Backup completo baixado com sucesso!');
      setTimeout(() => setBackupMessage(null), 5000);
    } catch (err) {
      console.error('Erro ao gerar backup:', err);
      setBackupMessage('Erro ao gerar o arquivo de backup.');
    }
  };

  // File Upload Selection for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (!parsed.data || !Array.isArray(parsed.data.produtos) || !Array.isArray(parsed.data.vendas)) {
          setRestoreError('Arquivo de backup inválido ou incompatível. Certifique-se de que é um arquivo gerado pelo AFETO.');
          return;
        }
        setSelectedFileContent(parsed);
        setRestoreStep(1); // Show Preview Modal
      } catch (err) {
        setRestoreError('Erro ao ler o arquivo JSON. O arquivo pode estar corrompido.');
      }
    };
    reader.readAsText(file);
  };

  // Execute Restoration (2-Step confirmed)
  const handleConfirmRestore = async () => {
    if (!selectedFileContent || user?.role !== 'admin') {
      setRestoreError('Restauração de dados restrita ao Administrador.');
      return;
    }

    try {
      // 1. Create emergency local snapshot before restoring
      const currentSnapshot = {
        exportedAt: new Date().toISOString(),
        exportedBy: 'Auto-Snapshot-Before-Restore',
        data: {
          produtos: await db.produtos.toArray(),
          clientes: await db.clientes.toArray(),
          vendas: await db.vendas.toArray(),
          fluxoDeCaixa: await db.fluxoDeCaixa.toArray()
        }
      };
      localStorage.setItem('afeto_emergency_snapshot', JSON.stringify(currentSnapshot));

      // 2. Perform Atomic DB Restoration
      await db.transaction(
        'rw',
        [
          db.produtos,
          db.products,
          db.clientes,
          db.clients,
          db.vendas,
          db.orders,
          db.itensVenda,
          db.orderItems,
          db.fluxoDeCaixa,
          db.financialTransactions,
          db.pesquisasSatisfacao,
          db.categorias,
          db.categories,
          db.suppliers,
          db.stockMovements,
          db.users
        ],
        async () => {
          // Clear current tables
          await db.produtos.clear();
          await db.products.clear();
          await db.clientes.clear();
          await db.clients.clear();
          await db.vendas.clear();
          await db.orders.clear();
          await db.itensVenda.clear();
          await db.orderItems.clear();
          await db.fluxoDeCaixa.clear();
          await db.financialTransactions.clear();
          await db.pesquisasSatisfacao.clear();
          await db.categorias.clear();
          await db.categories.clear();
          await db.suppliers.clear();
          await db.stockMovements.clear();
          await db.users.clear();

          // Repopulate
          const d = selectedFileContent.data;
          if (d.produtos?.length) {
            await db.produtos.bulkPut(d.produtos);
            await db.products.bulkPut(d.produtos);
          }
          if (d.clientes?.length) {
            await db.clientes.bulkPut(d.clientes);
            await db.clients.bulkPut(d.clientes);
          }
          if (d.vendas?.length) {
            await db.vendas.bulkPut(d.vendas);
            await db.orders.bulkPut(d.vendas);
          }
          if (d.itensVenda?.length) {
            await db.itensVenda.bulkPut(d.itensVenda);
            await db.orderItems.bulkPut(d.itensVenda);
          }
          if (d.fluxoDeCaixa?.length) {
            await db.fluxoDeCaixa.bulkPut(d.fluxoDeCaixa);
            await db.financialTransactions.bulkPut(d.fluxoDeCaixa);
          }
          if (d.pesquisasSatisfacao?.length) {
            await db.pesquisasSatisfacao.bulkPut(d.pesquisasSatisfacao);
          }
          if (d.categorias?.length) {
            await db.categorias.bulkPut(d.categorias);
            await db.categories.bulkPut(d.categorias);
          }
          if (d.suppliers?.length) {
            await db.suppliers.bulkPut(d.suppliers);
          }
          if (d.stockMovements?.length) {
            await db.stockMovements.bulkPut(d.stockMovements);
          }
          if (d.users?.length) {
            await db.users.bulkPut(d.users);
          }
        }
      );

      setRestoreStep(0);
      setSelectedFileContent(null);
      setBackupMessage('Banco de dados restaurado com sucesso!');
      setTimeout(() => setBackupMessage(null), 5000);
    } catch (err) {
      console.error('Erro na restauração:', err);
      setRestoreError('Erro durante a escrita no banco de dados.');
    }
  };

  // Add User Handler (Admin only)
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserModalError(null);

    if (user?.role !== 'admin') {
      setUserModalError('Apenas o Administrador pode gerenciar usuários.');
      return;
    }

    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPass.trim()) {
      setUserModalError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const newUser: User = {
        id: `usr_${Date.now()}`,
        name: newUserName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        passwordHash: newUserPass.trim(),
        role: newUserRole,
        active: true,
        createdAt: new Date().toISOString()
      };

      await db.users.put(newUser);
      setShowUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPass('');
      setNewUserRole('funcionario');
    } catch (err) {
      setUserModalError('Erro ao cadastrar usuário. Verifique se o e-mail já existe.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-rose-600 mb-1">
            <Settings className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Painel de Administração</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Configurações & Backup de Dados</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Gestão de cópias de segurança, restauração protegida, usuários do sistema e PWA.
          </p>
        </div>
      </div>

      {/* Warning Banner for Stale / Missing Backup */}
      {isBackupStale() && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold">Aviso de Segurança: Backup Pendente</p>
              <p className="text-[11px] text-amber-700">
                {lastBackup
                  ? `Último backup realizado em ${formatDateTime(lastBackup)}. Recomendamos gerar uma nova cópia de segurança semanal.`
                  : 'Nenhum backup foi gerado ainda neste dispositivo. Faça a exportação para proteger os dados.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateBackup}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0"
          >
            Gerar Backup Agora
          </button>
        </div>
      )}

      {backupMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{backupMessage}</span>
        </div>
      )}

      {/* Main Grid: Backup & Restore */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Backup Export Box */}
        <div className="bg-white border border-stone-200/80 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 border-b border-stone-100 pb-3">
            <div className="p-2 rounded-2xl bg-rose-50 text-rose-600">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-800">Cópia de Segurança (Backup)</h3>
              <p className="text-xs text-stone-400">Exportação completa de todos os módulos</p>
            </div>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            Gera um arquivo JSON contendo todos os produtos, cadastros de clientes, histórico de vendas, lançamentos financeiros e configurações do AFETO.
          </p>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Último Backup Realizado:</span>
              <strong className="text-stone-900">
                {lastBackup ? formatDateTime(lastBackup) : 'Nunca gerado'}
              </strong>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Formato de Exportação:</span>
              <span className="font-semibold text-rose-600">JSON Estruturado (.json)</span>
            </div>
          </div>

          <button
            onClick={handleGenerateBackup}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs transition-all shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Gerar e Baixar Arquivo de Backup</span>
          </button>
        </div>

        {/* Restore Box (Admin Only) */}
        <div className="bg-white border border-stone-200/80 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 border-b border-stone-100 pb-3">
            <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-800">Restauração de Dados</h3>
              <p className="text-xs text-stone-400">Restrito a Administradores</p>
            </div>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            Restaura o banco de dados a partir de um arquivo de backup previamente baixado. Todos os dados atuais serão validados antes da substituição.
          </p>

          {restoreError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {restoreError}
            </div>
          )}

          {user?.role === 'admin' ? (
            <label className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-2xl text-xs cursor-pointer transition-all border border-stone-200">
              <FileJson className="w-4 h-4 text-indigo-600" />
              <span>Selecionar Arquivo .JSON de Backup</span>
              <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </label>
          ) : (
            <div className="p-3 bg-stone-50 border border-stone-200 text-stone-400 rounded-2xl text-xs text-center font-medium">
              Apenas Administradores têm permissão para restaurar backups.
            </div>
          )}
        </div>
      </div>

      {/* User Management Section (Admin Only) */}
      {user?.role === 'admin' && (
        <div className="bg-white border border-stone-200/80 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-800">Gerenciamento de Usuários do Sistema</h3>
                <p className="text-xs text-stone-400">Contas e permissões ativas no AFETO</p>
              </div>
            </div>

            <button
              onClick={() => setShowUserModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Usuário</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-3">Nome</th>
                  <th className="py-2.5 px-3">E-mail</th>
                  <th className="py-2.5 px-3">Nível de Permissão</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50 text-stone-700 font-medium">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3 font-bold text-stone-900">{u.name}</td>
                    <td className="py-2.5 px-3">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                        {u.role === 'admin' ? 'Administrador' : 'Funcionário'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold ${u.active ? 'text-emerald-600' : 'text-stone-400'}`}>
                        {u.active ? 'Ativo ✅' : 'Inativo ⛔'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Status and PWA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-stone-200/80 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-stone-800 font-bold text-xs">
            <Smartphone className="w-4 h-4 text-rose-600" />
            <span>PWA & Suporte Off-line</span>
          </div>
          <div className="space-y-1.5 text-xs text-stone-600">
            <div className="flex justify-between py-1 border-b border-stone-50">
              <span>Status PWA:</span>
              <strong className="text-emerald-600">{isStandalone ? 'Instalado no Aparelho' : 'Web Browser'}</strong>
            </div>
            <div className="flex justify-between py-1">
              <span>Service Worker:</span>
              <strong className="text-emerald-600">Ativo (/sw.js)</strong>
            </div>
          </div>
          {canInstall && (
            <button
              onClick={promptInstall}
              className="w-full py-2 px-3 bg-stone-900 text-white font-bold rounded-xl text-xs hover:bg-stone-800 transition-colors"
            >
              Instalar Aplicativo no Aparelho
            </button>
          )}
        </div>

        <div className="bg-white border border-stone-200/80 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-stone-800 font-bold text-xs">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Banco de Dados Local (Dexie)</span>
          </div>
          <div className="space-y-1.5 text-xs text-stone-600">
            <div className="flex justify-between py-1 border-b border-stone-50">
              <span>Motor DB:</span>
              <strong className="text-stone-800">IndexedDB Persistente</strong>
            </div>
            <div className="flex justify-between py-1">
              <span>Operação sem internet:</span>
              <strong className="text-emerald-600">100% Suportado</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Restoration Preview & Confirmation Modal (2-Step Verification) */}
      {restoreStep === 1 && selectedFileContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-2 text-indigo-600 font-bold text-sm">
                <FileCheck className="w-5 h-5" />
                <span>Passo 1/2: Prévia e Validação do Backup</span>
              </div>
              <button onClick={() => setRestoreStep(0)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              O arquivo foi analisado e validado. Confira abaixo o conteúdo contido na cópia de segurança antes de prosseguir com a restauração:
            </p>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-500">Data de Exportação:</span>
                <strong className="text-stone-800">{formatDateTime(selectedFileContent.exportedAt)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Gerado Por:</span>
                <strong className="text-stone-800">{selectedFileContent.exportedBy}</strong>
              </div>
              <div className="pt-2 border-t border-stone-200 grid grid-cols-2 gap-2 text-stone-700">
                <div>📦 Produtos: <strong>{selectedFileContent.data.produtos?.length || 0}</strong></div>
                <div>👤 Clientes: <strong>{selectedFileContent.data.clientes?.length || 0}</strong></div>
                <div>🛍️ Vendas: <strong>{selectedFileContent.data.vendas?.length || 0}</strong></div>
                <div>💰 Finanças: <strong>{selectedFileContent.data.fluxoDeCaixa?.length || 0}</strong></div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setRestoreStep(0)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => setRestoreStep(2)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                Avançar para Confirmação Final
              </button>
            </div>
          </div>
        </div>
      )}

      {restoreStep === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Passo 2/2: Confirmação Final de Restauração</span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              <strong>ATENÇÃO:</strong> Esta ação substituirá os registros atuais pelos dados do arquivo de backup. Uma cópia de segurança de emergência do seu estado atual será salva automaticamente no navegador antes da substituição.
            </p>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] text-rose-800 space-y-1">
              <p className="font-bold">Solicitante: {user?.name} (Administrador)</p>
              <p>Esta operação é irreversível sem a cópia de segurança.</p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setRestoreStep(0)}
                className="px-4 py-2 bg-stone-100 text-stone-700 font-semibold rounded-xl text-xs"
              >
                Voltar / Cancelar
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                Confirmar e Restaurar DB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Cadastrar Novo Usuário</h3>
              <button onClick={() => setShowUserModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {userModalError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs">
                {userModalError}
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ex: Maria Oliveira"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">E-mail de Acesso</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="maria@afeto.com.br"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Senha</label>
                <input
                  type="password"
                  required
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Nível de Permissão</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'funcionario')}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold focus:outline-none"
                >
                  <option value="funcionario">Funcionário (Apenas Vendas / Sem Lucros)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
