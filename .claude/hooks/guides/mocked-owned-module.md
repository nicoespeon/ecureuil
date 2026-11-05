# mocked-owned-module

A mock is never checked against the module it replaces. The real function changes, the mock keeps returning what you told it to, and the test stays green: it proves the code works against a world you invented. Mocking a module **we wrote** (a relative path or `@ecureuil/*`) is the expensive case, because the logic you cut out is usually the logic you meant to test.

A mock of our own module usually means a decision is tangled with the I/O underneath it. Untangle it:

1. **Pull the decision out** into a pure function over plain data, and test it with plain data. The reducer works this way: `fold(events)` turns a journal into a state, and `reducer.test.ts` feeds it decoded events, no mock anywhere.
2. **Inject the port** the code depends on and give the test a real, in-memory adapter. The domain declares its ports (`EventStore`, `SyncTransport`, `Clock`) as Effect services for this; `App.test.tsx` renders `<App journal={inMemoryJournal(seed)} />` instead of mocking the journal.
3. **Use the real thing** when it is cheap: the API tests run against a local D1 through `@cloudflare/vitest-plugin`.

Globals we do not own are fine to control: `vi.spyOn(Date, "now")`, `vi.useFakeTimers()`, `vi.stubGlobal("localStorage", …)`.

Name the extracted function in domain terms (`listForMagasin`, `pendingDemande`); a name like `checkThreeFields` means the extraction was mechanical and the indirection now costs more than the mock did.

You are done when the test exercises our code for real and only controls what we do not own.
