// import WebBrowser from "@nodebug/selenium";

// async function test() {
//     let browser;
//     browser = new WebBrowser();
//     await browser.start();
    
//     // await browser.goto('https://seleniumbase.io/demo_page');
//     // await browser.button().click()
//     // await browser.textbox('Textarea:').write('test')
//     // // await browser.textbox('Textarea:').write('test')
//     // const isSelected = await browser.dropdown('Dropdown').option('Option 1').is.selected();
//     // const isNotSelected = await browser.dropdown('Dropdown').option('Option 2').is.not.selected();

//     // await browser.element("Text input").write("Hello World");
//     // await browser.element("Password").write("test");
//     // await browser.element("Textarea").write("test");

//     await browser.goto("file:///Users/thomasdsilva/Projects/test3/dropdowns.html");
//     await browser.dropdown('Single Select').option('Apple').select();


//     await browser.goto("file:///Users/thomasdsilva/Projects/selenium1/tests/fixtures/switches.html");
//     await browser.switch('iframe Toggle').on();
//     await browser.switch('Stable Checkbox').is.off();

//     await browser.switch('Hidden Checkbox').on();

//     await browser.switch('role=switch').on();

//     await browser.switch('aria-pressed Button').on();

//     await browser.switch('DIV Toggle').on();

//     try {
//       await browser.switch('Disabled Toggle').off();
//     } catch {
//       // Disabled toggle cannot be switched off
//     }

//     await browser.switch('Overlay Interception').on();
//     console.log()
//     // await browser.goto('https://the-internet.herokuapp.com/drag_and_drop');
//     // await browser.drag.element('A').onto.element('B').drop();
//     // await browser.switch(1).on();
//     // await browser.sleep(1000)
//     // const test = await browser.switch(1).is.on();
//     // await browser.switch().at.index(5).off();
//     // await browser.switch().at.index(5).should.be.off();

//     // await browser.switch(1).on();
//     await browser.switch(3).on();
//     // await browser.switch(5).on();

//     // await browser.table('Francisco Chang').should.be.visible();
//     // await browser.element("Francisco Chang").should.be.visible();
//     // try{
//     // await browser.element("").should.be.visible();
//     // } catch(err){
//     //     console.log(err.message)
//     // }
//     // await browser.row(2).should.be.visible();
//     // await browser.row(3).should.be.visible();
//     // await browser.element("Francisco Chang").within.row(3).should.be.visible();
//     // await browser.element("UK").within.row(5).should.be.visible();

//     // await browser.element(1).should.be.visible();
//     // await browser.element("Mexico").within.row("Francisco Chang").should.be.visible();
//     // // await browser.element("Mexico").within.column("Country").should.be.visible();

//     // await browser.column("Country").should.be.visible();
//     await browser.column("Country").findAll();
//     // await browser.column("UK").findAll();

//     // await browser.element("Mexico").within.row("Francisco Chang").should.be.visible();
//     // console.log(await browser.column("Country").within.row("Francisco Chang").get.text())
//     // await browser.element("Mexico").within.column("Country").should.be.visible();

//     await browser.element("Mexico").within.row("Francisco Chang").should.be.visible();
//     await browser.element("Mexico").within.column("Country").should.be.visible();
//     await browser.element("Mexico").within.column("Country").within.row("Francisco Chang").should.be.visible();
//     await browser.element("Mexico").within.row("Francisco Chang").within.column("Country").should.be.visible();

//     // await browser.button().below.button(2).should.be.visible();
//     // await browser.row(1).within.table('Francisco Chang').should.be.visible();
//     // await browser.row('Alfreds Futterkiste').within.table('Francisco Chang').should.be.visible();
//     // await browser.table('Defines a table caption').should.be.visible();
//     // await browser.row(1).should.be.visible();
//     // await browser.row(2).should.be.visible();
//     // await browser.row(3).should.be.visible();
//     // await browser.row(6).should.be.visible();
//     // await browser.row(7).should.be.visible();
//     // await browser.row(10).should.be.visible();


//     // await browser.goto("https://www.w3schools.com/html/default.asp");
//     // await browser.element('Learn HTML now').toLeftOf.element('Become HTML Certified').should.be.visible();
//     // await browser.element('Become HTML Certified').toRightOf.element('Learn HTML now').should.be.visible();
//     // await browser.element('Learn HTML now').toRightOf.element('Become HTML Certified').should.be.visible();

//     // await browser.goto("https://github.com/");
//     // await browser.element('Platform').within.element('Global').hover()
//     // await browser.element('The future of building happens together').within.element('hero-section-brand-heading').should.be.visible();
//     // await browser.element('Learn HTML now').within.element('Learn HTML').should.be.visible();
//     // await browser.element('Learn HTML now').within.element('Learn HTML').should.be.visible();

//     await browser.close();

// }
// test()