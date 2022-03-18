*** Settings ***
Library  AppiumLibrary
Resource    ../stocks/resources/keywords.robot
Resource    ../stocks/resources/locators.robot

*** Test Cases ***
Open Application On Android
    Open Application  http://localhost:4723/wd/hub  platformName=Android  deviceName=SM A305F  appPackage=com.gooogle.android.kuvera.app  appActivity=com.gooogle.android.kuvera.app.MainActivity
    sleep  10s  
    tap_on_screen
    sleep   5s
    input text    ${email}    ${email value}
    sleep   5s
    input text    ${password}    ${password value}
    sleep   5s
    Click Element  ${Login}
    sleep   5s
    Click Element   ${Set up later}
    sleep   5s
    Click Element   ${Watchlist}
    sleep   20s
    Click Element   ${Stocks}
    sleep   7s
    Click Element   ${Add to watchlist}
    sleep   5s
    Click Element   ${Tata Motors Ltd} 
    sleep  10s 
    Click Element   ${Buy}
    sleep   5s
    Click Element   ${close}  
    sleep   5s 
    tap_on_yes quite
    Press Keycode             4
    sleep   3s
    Press Keycode             4
    sleep   5s
    Click Element   ${Portfolio Primary}
    sleep   5s
    Click Element   ${Logout}
    sleep   5s

    

    
