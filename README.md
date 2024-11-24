# remove-hyphenation
Remove the hyphenation in an InDesign story.

The script will go through each paragraph in the current story (the one where the text cursor is active) and disable the hyphenation as an override. Then it will smartly adjust the paragraph's tracking, horizontal scale, and letter spacing, to preserve the number of lines in the paragraph, so it doesn't cause text shifts and reflows. 
