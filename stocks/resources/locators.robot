*** Settings ***
Library     AppiumLibrary

*** Variables ***
${email}    //*[contains(@resource-id, 'email')]
${email value}  TYPE YOUR EMAIL
${password}     //*[contains(@resource-id, 'password')]
${password value}   TYPE YOUR PASSWORD
${Login}    //*[contains(@text, 'LOGIN')]
${Set up later}     //*[contains(@text,'Setup Later')]
${Watchlist}    //*[contains(@text,'Watchlist')]
${Stocks}       //android.widget.TextView[contains(@text,'Stocks')]
${Add to watchlist}     //android.view.View[contains(@index,'8')]
${Tata Motors Ltd}      //*[contains(@text,'Tata Motors Ltd')]
${Buy}      //*[contains(@text,'Buy')]
${close}    //*[contains(@text,'close-nav-mobile')]
${Portfolio Primary}    //*[contains(@text,'Portfolio Primary')]
${Logout}   //*[contains(@text,'Logout')]
