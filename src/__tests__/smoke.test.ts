describe('test setup', () => {
  it('works', () => {
    expect(true).toBe(true);
  });

  it('has matchMedia mock', () => {
    const mql = window.matchMedia('(min-width: 768px)');
    expect(mql.matches).toBe(false);
  });
});
