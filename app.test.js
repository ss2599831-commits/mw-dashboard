/**
 * @jest-environment jsdom
 */

describe('refreshSession integration', () => {
  let mockAuthGetSession;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="authMsg"></div>
      <div id="auth"></div>
      <div id="app"></div>
      <button id="login"></button>
      <input id="email">
      <input id="password">
      <button id="signup"></button>
      <button id="logout"></button>
      <button id="importBtn"></button>
      <input id="startDate">
      <input id="endDate">
      <select id="store"></select>
      <input type="file" id="fileInput">
      <div id="result"></div>
    `;

    mockAuthGetSession = jest.fn().mockResolvedValue({ data: { session: null } });

    // Mock global dependencies before requiring app.js
    global.supabase = {
      createClient: jest.fn().mockReturnValue({
        auth: {
          getSession: mockAuthGetSession,
          onAuthStateChange: jest.fn(),
          signInWithPassword: jest.fn(),
          signUp: jest.fn(),
          signOut: jest.fn()
        }
      })
    };
    global.XLSX = {};
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('hides app when no session is present', async () => {
    jest.isolateModules(() => {
      require('./app.js');
    });

    // We need to wait for the microtask queue to process the async refreshSession
    await new Promise(resolve => setTimeout(resolve, 0));

    const authElement = document.getElementById('auth');
    const appElement = document.getElementById('app');

    expect(mockAuthGetSession).toHaveBeenCalled();
    expect(authElement.style.display).toBe('block');
    expect(appElement.style.display).toBe('none');
  });

  it('shows app when session is present', async () => {
    // Modify mock to return a valid session for the initial load
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: { user: 'test' } } });

    // Re-initialize app to pick up new mock return value
    jest.isolateModules(() => {
      require('./app.js');
    });

    // Wait for the async execution to finish
    await new Promise(resolve => setTimeout(resolve, 0));

    const authElement = document.getElementById('auth');
    const appElement = document.getElementById('app');

    expect(mockAuthGetSession).toHaveBeenCalled();
    expect(authElement.style.display).toBe('none');
    expect(appElement.style.display).toBe('block');
  });

  it('refreshSession returns session data correctly', async () => {
    let appModule;
    jest.isolateModules(() => {
      appModule = require('./app.js');
    });

    // Set the mock before calling refreshSession
    const sessionData = { user: 'test_user', token: '123' };
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: sessionData } });

    // Now call refreshSession directly via the module export
    const result = await appModule.refreshSession();

    expect(mockAuthGetSession).toHaveBeenCalled();
    expect(result).toBe(sessionData);

    const authElement = document.getElementById('auth');
    const appElement = document.getElementById('app');
    expect(authElement.style.display).toBe('none');
    expect(appElement.style.display).toBe('block');
  });
});
