describe("Porosite Page", () => {
  it("hap faqen e porosive", () => {
    cy.visit("http://localhost:5173/manager/orders");
    cy.contains("Porositë").should("exist");
  });

  it("kalon te Dhoma", () => {
    cy.visit("http://localhost:5173/manager/orders");
    cy.contains("Dhoma").click();
    cy.contains("DHOMË").should("exist");
  });

  it("butoni Printo ekziston", () => {
    cy.visit("http://localhost:5173/manager/orders");
    cy.contains("Printo").should("exist");
  });
});